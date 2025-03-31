use lumos_core::{
    sqlite::SqliteEngine,
    nlq::{
        NLQueryService, TranslatorFactory, QueryContext, 
        DbSchema, VerbosityLevel, QueryPreferences
    },
    LumosError, Result
};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<()> {
    env_logger::init();
    
    println!("Natural Language Query Example");
    println!("==============================");
    
    // Create a SQLite engine with a sample database
    let engine = create_sample_database()?;
    
    // Extract schema from the database
    let schema = extract_schema(&engine)?;
    println!("\nExtracted Schema Summary:");
    println!("{}", schema.to_summary());
    
    // Create a context with the schema
    let mut context = QueryContext::with_schema(schema);
    
    // Set SQL dialect preference to SQLite
    let preferences = QueryPreferences {
        sql_dialect: "sqlite".to_string(),
        verbosity: VerbosityLevel::Detailed,
        ..Default::default()
    };
    context.update_preferences(preferences);
    
    // Add some context variables
    context.add_variable("user_id", "1001");
    context.add_variable("current_date", "2023-12-01");
    
    // Create a translator and NL query service
    let translator = TranslatorFactory::create_composite();
    let mut nlq_service = NLQueryService::with_context(translator, context);
    
    // Define some example queries
    let example_queries = [
        "Show me all employees in the HR department",
        "What's the average salary of employees?",
        "Count how many departments we have",
        "Who are the highest paid employees?",
    ];
    
    // Process each query
    for (i, query) in example_queries.iter().enumerate() {
        println!("\n=== Query {} ===", i + 1);
        println!("Natural Language: {}", query);
        
        // Translate the query
        match nlq_service.translate(query).await {
            Ok(result) => {
                println!("\nGenerated SQL:");
                println!("{}", result.sql);
                println!("\nExplanation:");
                println!("{}", result.explanation);
                println!("\nConfidence: {:.2}", result.confidence);
                
                if !result.alternatives.is_empty() {
                    println!("\nAlternative SQL queries:");
                    for (i, alt) in result.alternatives.iter().enumerate() {
                        println!("{}. {}", i + 1, alt);
                    }
                }
                
                // Execute the query
                match engine.query_all(&result.sql, &[]) {
                    Ok(rows) => {
                        println!("\nQuery Results:");
                        if rows.is_empty() {
                            println!("No results found.");
                        } else {
                            // Print column names
                            let first_row = &rows[0];
                            let column_names: Vec<_> = first_row.column_names().collect();
                            for name in &column_names {
                                print!("{}\t", name);
                            }
                            println!();
                            
                            // Print separator
                            for _ in &column_names {
                                print!("--------\t");
                            }
                            println!();
                            
                            // Print each row
                            for row in rows {
                                for name in &column_names {
                                    let value = row.get::<_, Option<String>>(name)
                                        .unwrap_or_else(|_| None)
                                        .unwrap_or_else(|| "NULL".to_string());
                                    print!("{}\t", value);
                                }
                                println!();
                            }
                        }
                        
                        // Add to history with result info
                        nlq_service.get_context_mut().add_query_to_history(
                            query,
                            &result.sql,
                            true,
                            None,
                            Some(rows.len()),
                        );
                    }
                    Err(e) => {
                        println!("\nError executing query: {}", e);
                        
                        // Add to history with failure info
                        nlq_service.get_context_mut().add_query_to_history(
                            query,
                            &result.sql,
                            false,
                            None,
                            None,
                        );
                    }
                }
            }
            Err(e) => {
                println!("\nError translating query: {}", e);
            }
        }
        
        println!("\n----------------------------------------------------");
    }
    
    println!("\nDemonstrating SQL explanation functionality:");
    let sql_to_explain = "SELECT e.name, e.salary, d.name as department 
                         FROM employees e
                         JOIN departments d ON e.department_id = d.id
                         WHERE e.salary > 50000
                         ORDER BY e.salary DESC
                         LIMIT 5";
    
    println!("\nSQL to explain: {}", sql_to_explain);
    
    match nlq_service.explain_sql(sql_to_explain).await {
        Ok(explanation) => {
            println!("\nExplanation: {}", explanation.explanation);
            println!("\nBreakdown by clause:");
            for clause in explanation.breakdown {
                println!("\n{} clause: {}", clause.clause_type, clause.content);
                println!("Explanation: {}", clause.explanation);
            }
        }
        Err(e) => {
            println!("\nError explaining SQL: {}", e);
        }
    }
    
    Ok(())
}

fn create_sample_database() -> Result<SqliteEngine> {
    let engine = SqliteEngine::new_in_memory()?;
    
    // Create sample tables
    engine.execute(
        "CREATE TABLE departments (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            location TEXT
        )",
        &[],
    )?;
    
    engine.execute(
        "CREATE TABLE employees (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            department_id INTEGER,
            position TEXT,
            salary REAL,
            hire_date TEXT,
            FOREIGN KEY (department_id) REFERENCES departments(id)
        )",
        &[],
    )?;
    
    engine.execute(
        "CREATE TABLE projects (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            start_date TEXT,
            end_date TEXT
        )",
        &[],
    )?;
    
    engine.execute(
        "CREATE TABLE employee_projects (
            employee_id INTEGER,
            project_id INTEGER,
            role TEXT,
            PRIMARY KEY (employee_id, project_id),
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (project_id) REFERENCES projects(id)
        )",
        &[],
    )?;
    
    // Insert sample data - Departments
    let departments = [
        (1, "Engineering", "Building A"),
        (2, "HR", "Building B"),
        (3, "Marketing", "Building C"),
        (4, "Finance", "Building B"),
    ];
    
    for dept in &departments {
        engine.execute(
            "INSERT INTO departments (id, name, location) VALUES (?, ?, ?)",
            &[&dept.0 as &dyn rusqlite::ToSql, &dept.1, &dept.2],
        )?;
    }
    
    // Insert sample data - Employees
    let employees = [
        (1, "Alice Smith", 1, "Software Engineer", 75000.0, "2020-01-15"),
        (2, "Bob Johnson", 1, "Senior Developer", 95000.0, "2018-03-22"),
        (3, "Carol Williams", 2, "HR Manager", 82000.0, "2019-07-10"),
        (4, "Dave Brown", 3, "Marketing Specialist", 67000.0, "2021-02-05"),
        (5, "Eve Davis", 4, "Financial Analyst", 78000.0, "2020-11-18"),
        (6, "Frank Miller", 1, "QA Engineer", 72000.0, "2021-04-30"),
        (7, "Grace Wilson", 2, "Recruiter", 65000.0, "2022-01-10"),
        (8, "Hank Moore", 3, "Content Writer", 62000.0, "2021-09-15"),
        (9, "Ivy Taylor", 4, "Accountant", 71000.0, "2020-08-22"),
        (10, "Jack Anderson", 1, "DevOps Engineer", 88000.0, "2019-05-12"),
    ];
    
    for emp in &employees {
        engine.execute(
            "INSERT INTO employees (id, name, department_id, position, salary, hire_date) 
             VALUES (?, ?, ?, ?, ?, ?)",
            &[&emp.0 as &dyn rusqlite::ToSql, &emp.1, &emp.2, &emp.3, &emp.4, &emp.5],
        )?;
    }
    
    // Insert sample data - Projects
    let projects = [
        (1, "Website Redesign", "Redesign company website", "2023-01-01", "2023-06-30"),
        (2, "Mobile App", "Develop mobile application", "2023-03-15", "2023-12-31"),
        (3, "Database Migration", "Migrate to new database system", "2023-02-10", "2023-05-15"),
        (4, "Annual Audit", "Prepare for annual financial audit", "2023-10-01", "2023-12-15"),
    ];
    
    for proj in &projects {
        engine.execute(
            "INSERT INTO projects (id, name, description, start_date, end_date) 
             VALUES (?, ?, ?, ?, ?)",
            &[&proj.0 as &dyn rusqlite::ToSql, &proj.1, &proj.2, &proj.3, &proj.4],
        )?;
    }
    
    // Insert sample data - Employee Projects
    let employee_projects = [
        (1, 1, "Frontend Developer"),
        (2, 1, "Backend Developer"),
        (6, 1, "QA Tester"),
        (1, 2, "Developer"),
        (2, 2, "Lead Developer"),
        (10, 2, "DevOps Support"),
        (2, 3, "Technical Lead"),
        (10, 3, "Database Administrator"),
        (5, 4, "Financial Support"),
        (9, 4, "Lead Accountant"),
    ];
    
    for ep in &employee_projects {
        engine.execute(
            "INSERT INTO employee_projects (employee_id, project_id, role) VALUES (?, ?, ?)",
            &[&ep.0 as &dyn rusqlite::ToSql, &ep.1, &ep.2],
        )?;
    }
    
    // Add semantics
    add_semantics(&engine)?;
    
    Ok(engine)
}

fn add_semantics(engine: &SqliteEngine) -> Result<()> {
    // Create a table to store semantic descriptions
    engine.execute(
        "CREATE TABLE IF NOT EXISTS semantic_descriptions (
            object_name TEXT PRIMARY KEY,
            description TEXT NOT NULL
        )",
        &[],
    )?;
    
    // Add descriptions for tables
    let table_descriptions = [
        ("departments", "Organizational departments within the company"),
        ("employees", "All employees working at the company"),
        ("projects", "Projects the company is working on"),
        ("employee_projects", "Mapping of which employees are working on which projects"),
    ];
    
    for desc in &table_descriptions {
        engine.execute(
            "INSERT INTO semantic_descriptions (object_name, description) VALUES (?, ?)",
            &[&desc.0 as &dyn rusqlite::ToSql, &desc.1],
        )?;
    }
    
    // Add descriptions for columns
    let column_descriptions = [
        ("departments.id", "Unique identifier for the department"),
        ("departments.name", "Name of the department"),
        ("departments.location", "Physical location of the department"),
        
        ("employees.id", "Unique identifier for the employee"),
        ("employees.name", "Full name of the employee"),
        ("employees.department_id", "Department the employee works in"),
        ("employees.position", "Job title or position of the employee"),
        ("employees.salary", "Annual salary of the employee in USD"),
        ("employees.hire_date", "Date when the employee was hired"),
        
        ("projects.id", "Unique identifier for the project"),
        ("projects.name", "Name of the project"),
        ("projects.description", "Brief description of the project's goals"),
        ("projects.start_date", "Date when the project started"),
        ("projects.end_date", "Expected or actual completion date"),
        
        ("employee_projects.employee_id", "Employee assigned to the project"),
        ("employee_projects.project_id", "Project the employee is working on"),
        ("employee_projects.role", "Employee's role on the specific project"),
    ];
    
    for desc in &column_descriptions {
        engine.execute(
            "INSERT INTO semantic_descriptions (object_name, description) VALUES (?, ?)",
            &[&desc.0 as &dyn rusqlite::ToSql, &desc.1],
        )?;
    }
    
    Ok(())
}

fn extract_schema(engine: &SqliteEngine) -> Result<DbSchema> {
    use lumos_core::nlq::schema::extractor;
    
    // Extract schema from the database
    let mut schema = extractor::extract_from_sqlite(engine)?;
    
    // Add semantic descriptions from our semantics table
    let descriptions = engine.query_all(
        "SELECT object_name, description FROM semantic_descriptions",
        &[],
    )?;
    
    for row in descriptions {
        let object = row.get::<_, String>("object_name")
            .map_err(|e| LumosError::Other(format!("Failed to get object name: {}", e)))?;
        let description = row.get::<_, String>("description")
            .map_err(|e| LumosError::Other(format!("Failed to get description: {}", e)))?;
        
        schema.add_description(&object, &description);
    }
    
    Ok(schema)
} 