plugins {
    id("java")
    id("application")
    id("com.github.johnrengelman.shadow") version "8.1.1" 
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(libs.aws.lambda.java.core)
    implementation(libs.aws.lambda.java.events)

    testImplementation(libs.jackson)

    testImplementation(platform(libs.junit.bom))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testImplementation("org.junit.platform:junit-platform-launcher")
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
        archiveFileName.set("lambda-java.jar")
    }

    named<Test>("test") {
        useJUnitPlatform()
    }

    register<Test>("invoke") {
        useJUnitPlatform {
            includeTags("invoke")
        }
        testLogging {
            showStandardStreams = true
        }
    }
}

