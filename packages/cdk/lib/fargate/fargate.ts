import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class FargateStack extends cdk.NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.NestedStackProps & {
      DEPLOY_ENV: string;
      vpcId: string;
      subnetId: string;
    }
  ) {
    super(scope, id, props);

    const fargateCluster = new cdk.aws_ecs.CfnCluster(this, "Cluster", {
      clusterName: `${props.DEPLOY_ENV}-46ki75-examples-ecs-cluster-main`,
      capacityProviders: ["FARGATE"],
      clusterSettings: [{ name: "containerInsights", value: "enabled" }],
      configuration: {
        executeCommandConfiguration: {
          logging: "DEFAULT",
        },
      },
    });

    const taskExecutionRole = new cdk.aws_iam.Role(
      this,
      "FargateTaskExecutionRole",
      {
        roleName: `${props.DEPLOY_ENV}-46ki75-examples-iam-role-FargateTaskExecutionRole`,
        assumedBy: new cdk.aws_iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        inlinePolicies: {
          MyPolicy: new cdk.aws_iam.PolicyDocument({
            statements: [
              new cdk.aws_iam.PolicyStatement({
                effect: cdk.aws_iam.Effect.ALLOW,
                actions: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                ],
                resources: ["*"],
              }),
            ],
          }),
        },
      }
    );

    const taskRole = new cdk.aws_iam.Role(this, "FargateTaskRole", {
      roleName: `${props.DEPLOY_ENV}-46ki75-examples-iam-role-FargateTaskRole`,
      assumedBy: new cdk.aws_iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      inlinePolicies: {
        MyPolicy: new cdk.aws_iam.PolicyDocument({
          statements: [
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: [
                "ssmmessages:CreateControlChannel",
                "ssmmessages:CreateDataChannel",
                "ssmmessages:OpenControlChannel",
                "ssmmessages:OpenDataChannel",
              ],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    const LOG_GROUP_NAME = `/${props.DEPLOY_ENV}/ecs/46ki75-aws-fargate-task`;

    const logGroup = new cdk.aws_logs.CfnLogGroup(this, "LogGroup", {
      logGroupName: LOG_GROUP_NAME,
      retentionInDays: 1,
      logGroupClass: "STANDARD",
    });

    const taskDefinition = new cdk.aws_ecs.CfnTaskDefinition(
      this,
      "TaskDefinition",
      {
        family: `${props.DEPLOY_ENV}-46ki75-examples-ecs-TaskDefinition-web`,
        cpu: String(1024 * 0.25),
        memory: String(1024 * 0.5),
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        executionRoleArn: taskExecutionRole.roleArn,
        taskRoleArn: taskRole.roleArn,
        containerDefinitions: [
          {
            name: `${props.DEPLOY_ENV}-46ki75-examples-ecs-TaskDefinition-web`,
            essential: true,
            image: "caddy:latest",
            cpu: 1024 * 0.25,
            memory: 1024 * 0.5,
            linuxParameters: { initProcessEnabled: true },
            portMappings: [{ containerPort: 80, protocol: "tcp" }],
            healthCheck: {
              command: ["CMD-SHELL", "exit 0"],
              interval: 30,
              timeout: 5,
              retries: 3,
              startPeriod: 10,
            },
            logConfiguration: {
              logDriver: "awslogs",
              options: {
                "awslogs-group": LOG_GROUP_NAME,
                "awslogs-region": "ap-northeast-1",
                "awslogs-stream-prefix": "web-container",
              },
            },
          },
        ],
      }
    );

    const sg = new cdk.aws_ec2.CfnSecurityGroup(this, "SG", {
      groupName: `${props.DEPLOY_ENV}-46ki75-examples-vpc-sg-web`,
      groupDescription: "Allow HTTP traffic for Fargate web service",
      vpcId: props.vpcId,
      securityGroupEgress: [{ ipProtocol: "-1", cidrIp: "0.0.0.0/0" }],
      securityGroupIngress: [
        { ipProtocol: "tcp", cidrIp: "0.0.0.0/0", fromPort: 80, toPort: 80 },
      ],
    });

    const fargateWebService = new cdk.aws_ecs.CfnService(this, "Service", {
      serviceName: `${props.DEPLOY_ENV}-46ki75-examples-ecs-service-web`,
      cluster: fargateCluster.attrArn,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: [props.subnetId],
          securityGroups: [sg.attrId],
          assignPublicIp: "ENABLED",
        },
      },
      desiredCount: 1,
      enableExecuteCommand: true,
      launchType: "FARGATE",
      propagateTags: "TASK_DEFINITION",
      taskDefinition: taskDefinition.ref,
    });
  }
}
