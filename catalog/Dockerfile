FROM maven:3-amazoncorretto-27-alpine AS build

ARG JAR_NAME=catalog-0.0.1-SNAPSHOT.jar

LABEL authors="cesar"
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src/main ./src/main

RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jre-ubi10-minimal AS production

WORKDIR /app

RUN groupadd -r appgroup &&  \
    useradd -r -g appgroup appuser

COPY --from=build /app/target/*.jar /app/app.jar

RUN chown appuser:appgroup -R /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "./app.jar"]