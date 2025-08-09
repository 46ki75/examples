plugins {
	java
	id("org.springframework.boot") version "3.5.4"
	id("io.spring.dependency-management") version "1.1.7"
    id("com.github.johnrengelman.shadow") version "8.1.1" 
}

group = "cloud.ikuma"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter")
	implementation("org.springframework.cloud:spring-cloud-function-adapter-aws:4.3.0")
	implementation("org.springframework.cloud:spring-cloud-function-context:4.3.0")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

tasks {
    shadowJar {
        // For AWS Lambda
        archiveFileName.set("lambda-spring.jar")
		mergeServiceFiles()

		mergeServiceFiles {
			include("META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports")
			include("META-INF/spring.factories")
		}

		manifest {
			attributes("Start-Class" to "cloud.ikuma.lambda_spring.LambdaSpringApplication")
		}
    }
}