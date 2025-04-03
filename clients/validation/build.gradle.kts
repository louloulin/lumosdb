import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.7.20"
    application
}

group = "io.lumosdb.validation"
version = "0.1.0"

repositories {
    mavenCentral()
    mavenLocal() // 查找本地Maven仓库中的依赖
    
    // 引用本地项目文件
    flatDir {
        dirs("../kotlin/build/libs")
    }
}

dependencies {
    // 使用文件引用，包含正确的jar文件名
    implementation(files("../kotlin/build/libs/lumosdb-kotlin-0.1.0.jar"))
    
    // 需要的依赖项
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
    implementation("io.ktor:ktor-client-core:2.2.1")
    implementation("io.ktor:ktor-client-cio:2.2.1")
    implementation("io.ktor:ktor-client-content-negotiation:2.2.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.2.1")
    implementation("io.ktor:ktor-client-logging:2.2.1")
    implementation("io.github.microutils:kotlin-logging:3.0.4")
    implementation("ch.qos.logback:logback-classic:1.4.5")
}

application {
    mainClass.set("io.lumosdb.validation.ValidateKotlinKt")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
        freeCompilerArgs = listOf("-Xjsr305=strict")
    }
}

// 解决Task.project问题
project.gradle.taskGraph.whenReady {
    tasks.withType<KotlinCompile> {
        kotlinOptions.freeCompilerArgs += listOf("-Xskip-prerelease-check")
    }
}

// 添加依赖关系，但避免使用project引用
// 使用相对路径代替绝对路径引用
tasks.register("ensureKotlinClientBuilt") {
    doLast {
        val kotlinClientJar = file("../kotlin/build/libs/lumosdb-kotlin-0.1.0.jar")
        if (!kotlinClientJar.exists()) {
            throw GradleException("Kotlin client JAR not found. Please build the Kotlin client first.")
        }
    }
}

tasks.named("compileKotlin") {
    dependsOn("ensureKotlinClientBuilt")
} 