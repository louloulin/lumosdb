import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.7.20"
    application
}

group = "io.lumosdb.validation"
version = "0.1.0"

repositories {
    mavenCentral()
    mavenLocal()
    flatDir {
        dirs("../kotlin/build/libs")
    }
}

dependencies {
    implementation(files("../kotlin/build/libs/lumosdb-kotlin-0.1.0.jar"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.4.1")
    implementation("io.ktor:ktor-client-core:2.2.1")
    implementation("io.ktor:ktor-client-cio:2.2.1")
    implementation("io.ktor:ktor-client-content-negotiation:2.2.1")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.2.1")
    implementation("io.ktor:ktor-client-logging:2.2.1")
}

application {
    mainClass.set("io.lumosdb.validation.ValidateKotlinKt")
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "1.8"
} 