import "dotenv/config";
import { corsair } from "./corsair";

async function main() {
  //   const res = await corsair.withTenant("shubham").gmail.api.threads.list({});
  const res = await corsair.withTenant("shubham").gmail.db.threads.search({
    data: {
      snippet: {
        contains: "Apple",
      },
    },
  }); // corsair caches the threads in the database, so this should be fast on subsequent calls

  console.log(res);
}

main();
