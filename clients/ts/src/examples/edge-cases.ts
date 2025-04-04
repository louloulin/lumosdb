import { LumosDBClient } from '../index';

/**
 * 此示例用于测试LumosDB客户端的边缘情况处理
 * 包括:
 * - 特殊字符表名
 * - 长表名
 * - 包含各种数据类型的表
 * - 大量行数据的查询
 * - 带有Unicode字符的数据
 */
async function main() {
  try {
    // 创建客户端实例
    const client = new LumosDBClient('http://127.0.0.1:8080');
    console.log('LumosDB 客户端已初始化');
    
    // 时间戳后缀确保每次运行都使用新的表名
    const timestamp = Date.now();

    // 测试1：特殊字符表名
    console.log('\n===== 测试 1: 特殊字符表名 =====');
    const specialCharTables = [
      `"test-hyphen-${timestamp}"`,
      `"test.dot.${timestamp}"`,
      `"test_underscore_${timestamp}"`,
      `"test@symbol@${timestamp}"`,
      `"test中文名${timestamp}"`,
      `"test-123-${timestamp}"`
    ];

    for (const tableName of specialCharTables) {
      try {
        console.log(`>> 创建特殊字符表: ${tableName}`);
        await client.db.execute(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`);
        console.log('✅ 成功创建表');
        
        // 插入数据
        await client.db.execute(`INSERT INTO ${tableName} (id, name) VALUES (1, 'test')`);
        console.log('✅ 成功插入数据');
        
        // 查询数据
        const result = await client.db.query(`SELECT * FROM ${tableName}`);
        console.log('✅ 成功查询数据:', result);
        
        // 删除表
        await client.db.execute(`DROP TABLE ${tableName}`);
        console.log('✅ 成功删除表');
      } catch (error: unknown) {
        console.log(`❌ 表 ${tableName} 操作失败:`, error instanceof Error ? error.message : String(error));
      }
    }

    // 测试2：长表名
    console.log('\n===== 测试 2: 长表名 =====');
    // SQLite表名长度限制一般是128字节
    const longTableName = `"test_very_long_table_name_${'x'.repeat(100)}_${timestamp}"`;
    
    try {
      console.log(`>> 创建长表名: ${longTableName.length} 字符`);
      await client.db.execute(`CREATE TABLE ${longTableName} (id INTEGER PRIMARY KEY, name TEXT)`);
      console.log('✅ 成功创建长表名表');
      
      // 插入和查询
      await client.db.execute(`INSERT INTO ${longTableName} (id, name) VALUES (1, 'test')`);
      const result = await client.db.query(`SELECT * FROM ${longTableName}`);
      console.log('✅ 成功操作长表名表:', result);
      
      // 删除表
      await client.db.execute(`DROP TABLE ${longTableName}`);
      console.log('✅ 成功删除长表名表');
    } catch (error: unknown) {
      console.log('❌ 长表名操作失败:', error instanceof Error ? error.message : String(error));
    }

    // 测试3：包含各种数据类型的表
    console.log('\n===== 测试 3: 多数据类型 =====');
    const multiTypeTableName = `"test_types_${timestamp}"`;
    
    try {
      console.log('>> 创建包含多种数据类型的表');
      const createTableSQL = `
        CREATE TABLE ${multiTypeTableName} (
          id INTEGER PRIMARY KEY,
          text_col TEXT,
          real_col REAL,
          blob_col BLOB,
          null_col TEXT,
          bool_col INTEGER,
          date_col TEXT
        )
      `;
      await client.db.execute(createTableSQL);
      console.log('✅ 成功创建多数据类型表');
      
      // 准备各种类型的数据
      const textData = "常规文本";
      const realData = 3.14159265359;
      const blobData = Buffer.from('二进制数据').toString('base64');
      const boolData = 1; // SQLite没有布尔类型，使用0/1
      const dateData = new Date().toISOString();
      
      // 插入数据
      const insertSQL = `
        INSERT INTO ${multiTypeTableName} 
        (id, text_col, real_col, blob_col, null_col, bool_col, date_col)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await client.db.execute(insertSQL, [1, textData, realData, blobData, null, boolData, dateData]);
      console.log('✅ 成功插入多种数据类型');
      
      // 查询数据
      const result = await client.db.query(`SELECT * FROM ${multiTypeTableName}`);
      console.log('✅ 查询结果:', result);
      
      // 删除表
      await client.db.execute(`DROP TABLE ${multiTypeTableName}`);
      console.log('✅ 成功删除多数据类型表');
    } catch (error: unknown) {
      console.log('❌ 多数据类型操作失败:', error instanceof Error ? error.message : String(error));
    }

    // 测试4：大量数据行
    console.log('\n===== 测试 4: 大量数据行 =====');
    const bulkTableName = `"test_bulk_${timestamp}"`;
    const rowCount = 1000; // 尝试插入1000行
    
    try {
      console.log(`>> 创建用于大量数据的表`);
      await client.db.execute(`
        CREATE TABLE ${bulkTableName} (
          id INTEGER PRIMARY KEY,
          name TEXT,
          value REAL
        )
      `);
      console.log('✅ 成功创建表');
      
      // 批量插入数据
      console.log(`>> 插入 ${rowCount} 行数据`);
      const startTime = Date.now();
      
      // 为了效率，使用事务
      await client.db.execute('BEGIN TRANSACTION');
      
      for (let i = 0; i < rowCount; i++) {
        await client.db.execute(
          `INSERT INTO ${bulkTableName} (id, name, value) VALUES (?, ?, ?)`,
          [i, `item-${i}`, Math.random() * 100]
        );
        
        // 每100行打印一次进度
        if (i % 100 === 0 && i > 0) {
          console.log(`已插入 ${i} 行...`);
        }
      }
      
      await client.db.execute('COMMIT');
      
      const endTime = Date.now();
      console.log(`✅ 成功插入 ${rowCount} 行数据，耗时: ${endTime - startTime}ms`);
      
      // 查询部分数据
      console.log('>> 查询前10行数据');
      const result = await client.db.query(`SELECT * FROM ${bulkTableName} LIMIT 10`);
      console.log('✅ 查询结果:', result);
      
      // 统计行数
      const countResult = await client.db.query(`SELECT COUNT(*) as count FROM ${bulkTableName}`);
      let rowCount;
      if (Array.isArray(countResult.rows) && countResult.rows.length > 0) {
        const firstRow = countResult.rows[0];
        if (typeof firstRow === 'object' && firstRow !== null) {
          rowCount = ('count' in firstRow) ? firstRow.count : 
                    (Array.isArray(firstRow) ? firstRow[0] : undefined);
        }
      }
      console.log(`✅ 表中共有 ${rowCount || '未知'} 行数据`);
      
      // 删除表
      await client.db.execute(`DROP TABLE ${bulkTableName}`);
      console.log('✅ 成功删除大量数据表');
    } catch (error: unknown) {
      console.log('❌ 大量数据操作失败:', error instanceof Error ? error.message : String(error));
    }

    // 测试5：Unicode字符
    console.log('\n===== 测试 5: Unicode字符数据 =====');
    const unicodeTableName = `"test_unicode_${timestamp}"`;
    
    try {
      console.log('>> 创建Unicode数据测试表');
      await client.db.execute(`
        CREATE TABLE ${unicodeTableName} (
          id INTEGER PRIMARY KEY,
          unicode_text TEXT
        )
      `);
      
      // 准备各种Unicode字符
      const unicodeData = [
        { id: 1, text: "English Text" },
        { id: 2, text: "中文文本" },
        { id: 3, text: "日本語テキスト" },
        { id: 4, text: "한국어 텍스트" },
        { id: 5, text: "Русский текст" },
        { id: 6, text: "Ελληνικό κείμενο" },
        { id: 7, text: "नमस्ते दुनिया" },
        { id: 8, text: "Emojis: 😀🚀💻🌐" }
      ];
      
      // 插入Unicode数据
      for (const data of unicodeData) {
        await client.db.execute(
          `INSERT INTO ${unicodeTableName} (id, unicode_text) VALUES (?, ?)`,
          [data.id, data.text]
        );
      }
      console.log('✅ 成功插入Unicode数据');
      
      // 查询数据
      const result = await client.db.query(`SELECT * FROM ${unicodeTableName}`);
      console.log('✅ 查询Unicode数据:');
      result.rows.forEach((row, index) => {
        // 尝试直接通过列名访问
        if (typeof row === 'object' && row !== null) {
          if ('id' in row && 'unicode_text' in row) {
            console.log(`ID: ${row.id}, Text: ${row.unicode_text}`);
          } else {
            // 使用数组索引访问
            console.log(`ID: ${row[0]}, Text: ${row[1]}`);
          }
        } else {
          console.log(`行 ${index}: ${String(row)}`);
        }
      });
      
      // 删除表
      await client.db.execute(`DROP TABLE ${unicodeTableName}`);
      console.log('✅ 成功删除Unicode测试表');
    } catch (error: unknown) {
      console.log('❌ Unicode数据操作失败:', error instanceof Error ? error.message : String(error));
    }

    console.log('\n===== 边缘情况测试完成 =====');
  } catch (error: unknown) {
    console.error('测试过程中发生错误:', error instanceof Error ? error.message : String(error));
  }
}

main(); 