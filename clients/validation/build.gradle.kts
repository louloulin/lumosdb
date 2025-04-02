import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "1.7.20"
    application
}

group = "io.lumosdb.validation"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation(project(":clients:kotlin"))
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4")
}

application {
    mainClass.set("io.lumosdb.validation.ValidateKotlinKt")
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "1.8"
} 