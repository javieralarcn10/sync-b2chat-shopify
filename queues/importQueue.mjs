import Queue from "bull";
import { CronJob } from "cron";
import { getCustomers } from "../apis/shopify.mjs";
import { mapCustomersFromShopify } from "../utils/functions.mjs";
import { contactQueue } from "./contactQueue.mjs";

export const importQueue = new Queue("importQueue", {
    limiter: {
        max: 1,
        duration: 2000,
    },
    redis: "redis://127.0.0.1:6379",
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

importQueue.process(async function(job) {
    const { shop, token } = job.data;
    //Save shop and token in db

    const shopifyCustomers = await getCustomers();
    const mappedCustomers = mapCustomersFromShopify(shopifyCustomers);

    const bulkJobs = mappedCustomers.map(customer => ({
        name: 'syncContact',
        data: customer,
    }));

    await contactQueue.addBulk(bulkJobs);
});

importQueue.on("failed", (job, error) => {
    console.error(`Job ${job.id} in importQueue failed, customer ${job.data.id}`, error);
});

//RETRY FAILED JOBS
async function retryFailedJobs() {
    try {
        const failedJobs = await importQueue.getFailed();
        console.log(`Encountered ${failedJobs.length} failed jobs in importQueue.`);

        for (const job of failedJobs) {
            try {
                await job.retry();
                console.log(`Job ID ${job.id} retried successfully.`);
            } catch (retryError) {
                console.error(`Error retrying job ID ${job.id}:`, retryError);
            }
        }
    } catch (error) {
        console.error("Error getting or retrying failed jobs:", error);
    }
}

const retryFailedJobsCron = new CronJob(
    "0 3 * * *",
    function() {
        retryFailedJobs();
    },
    null,
    true,
    "Europe/Madrid",
);