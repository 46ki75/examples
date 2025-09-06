import { Tags, type IAspect } from "aws-cdk-lib";
import { type IConstruct } from "constructs";

export class AutoTagAspect implements IAspect {
  constructor(
    private key: string,
    private value: string
  ) {}

  visit(node: IConstruct): void {
    Tags.of(node).add(this.key, this.value);
  }
}
