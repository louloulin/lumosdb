import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.7.20"
    kotlin("plugin.serialization") version "1.7.20"
    `maven-publish`
    application
}

group = "io.lumosdb"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    // Kotlin基础库
    implementation(kotlin("stdlib"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")

    // HTTP客户端
    implementation("io.ktor:ktor-client-core:2.2.1")
    implementation("io.ktor:ktor-client-cio:2.2.1")
    implementation("io.ktor:ktor-client-content-negotiation:2.2.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.2.1")
    implementation("io.ktor:ktor-client-logging:2.2.1")

    // 日志
    implementation("io.github.microutils:kotlin-logging:3.0.4")
    implementation("ch.qos.logback:logback-classic:1.4.5")

    // 测试
    testImplementation(kotlin("test"))
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.6.4")
    testImplementation("io.mockk:mockk:1.13.3")
    testImplementation("io.ktor:ktor-client-mock:2.2.1")
}

application {
    mainClass.set("io.lumosdb.example.BasicExampleKt")
}

java {
    withSourcesJar()
    withJavadocJar()
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
        freeCompilerArgs = listOf("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            from(components["java"])
            
            pom {
                name.set("LumosDB Kotlin SDK")
                description.set("Kotlin client SDK for LumosDB")
                url.set("https://github.com/linchonglin/lumos-db")
                licenses {
                    license {
                        name.set("MIT")
                        url.set("https://opensource.org/licenses/MIT")
                    }
                }
                developers {
                    developer {
                        id.set("lumos")
                        name.set("LumosDB Team")
                        email.set("info@lumosdb.io")
                    }
                }
            }
        }
    }
    
    repositories {
        mavenLocal()
    }
}