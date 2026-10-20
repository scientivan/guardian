import { loadEnvConfig } from "@next/env";
import { openHospitalDirectory } from "../src/server/hospital-directory";
import hospitals from "../src/server/hospital-seeds.json";

loadEnvConfig(process.cwd());
const directory=openHospitalDirectory();
try {
  let added=0;
  for(const h of hospitals)if(directory.seedListing(h.id,h.profile,h.sources))added++;
  console.log(`Added ${added} public hospital listings. Existing records were preserved. Identity reviews are pending and no payment accounts were activated.`);
} finally {directory.close();}
