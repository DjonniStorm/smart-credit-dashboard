import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";

import { GetExampleQuery } from "./get-example.query.ts";

@QueryHandler(GetExampleQuery)
export class GetExampleHandler implements IQueryHandler<GetExampleQuery> {
  async execute() {
    return { source: "query" as const };
  }
}
