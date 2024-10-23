import Queue from "bull";
import { CronJob } from "cron";
import { addTagsToContact, getContact, removeTagsFromContact } from "../apis/b2chat.mjs";
import { getCustomer } from "../apis/shopify.mjs";

export const tagsQueue = new Queue("tagsQueue", {
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

tagsQueue.process(async function (job) {
  const { customerId, tags, type, shop, token } = job.data;

  const customerData = await getCustomer({ customerId, shop, token });
  const contactInB2Chat = await getContact({ customer: customerData });
  const id = contactInB2Chat?.contact_id;

  if (!contactInB2Chat) return;

  if (type === "add") {
    await addTagsToContact({ customer: id, tags });
  } else if (type === "remove") {
    await removeTagsFromContact({ customer: id, tags });
  }
});

tagsQueue.on("failed", (job, error) => {
  console.error(`Job ${job.id} in tagsQueue failed, customer ${job.data.id}`, error);
});

//RETRY FAILED JOBS
async function retryFailedJobs() {
  try {
    const failedJobs = await tagsQueue.getFailed();
    console.log(`Encountered ${failedJobs.length} failed jobs in tagsQueue.`);

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
  "0 2 * * *",
  function () {
    retryFailedJobs();
  },
  null,
  true,
  "Europe/Madrid",
);
