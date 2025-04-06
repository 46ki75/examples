plugins {
    id("java")
    id("application")
    id("com.github.johnrengelman.shadow") version "8.1.1" 
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.amazonaws:aws-lambda-java-core:1.2.3")
    implementation("com.amazonaws:aws-lambda-java-events:3.14.0")
    runtimeOnly("com.amazonaws:aws-lambda-java-log4j:1.0.1")

    testImplementation(platform("org.junit:junit-bom:5.10.0"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.2")

    implementation("com.google.guava:guava:32.1.2-jre")
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

application {
    // For local execution
    mainClass = "example.local.Local"
}

tasks {
    shadowJar {
        // For AWS Lambda
        archiveFileName.set("lambda.jar")
        manifest {
            // Main-Class: example.Local
            attributes["Main-Class"] = "example.local.Local" 
        }
    }

    named<Test>("test") {
        useJUnitPlatform()
    }
}

tasks.build {
    dependsOn(tasks.shadowJar)
}
