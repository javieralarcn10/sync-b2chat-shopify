import Queue from "bull";
import { createContact, getContact, updateContact } from "../apis/b2chat.mjs";
import { formatPhoneNumber, limitString } from "../utils/functions.mjs";
import { CronJob } from "cron";

export const contactQueue = new Queue("contactQueue", {
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

contactQueue.process(async function (job) {
  const customer = job.data;
  let address = null;

  //If the customer doesn't have a phone, we try to get it from the default address
  if (!customer.phone) {
    if (customer.default_address) {
      if (!customer.phone) {
        customer.phone = formatPhoneNumber({
          number: customer.default_address?.phone,
          countryCode: customer.default_address?.country_code,
        });
      }
      address = {
        address: limitString(`${customer.default_address?.address1} ${customer.default_address?.address2}`),
        country: customer.default_address?.country_code,
        city: customer.default_address?.city,
      };
    }
  }

  if (customer.phone) {
    const customerData = {
      skip_required_custom_attributes: true,
      skip_errors: true,
      contact: {
        fullname: limitString(`${customer.first_name} ${customer?.last_name}`),
        fullName: limitString(`${customer.first_name} ${customer?.last_name}`), //Required for update full name (error b2chat)
        mobile: customer.phone?.replace(/\s+/g, ""),
        email: limitString(customer.email),
        identification: limitString(customer.id),
        ...address,
      },
    };
    const contactInB2Chat = await getContact({ customer: customerData });
    if (contactInB2Chat) {
      await updateContact({
        customer: {
          ...customerData,
          contact: {
            ...contactInB2Chat,
            ...customerData?.contact,
          },
        },
        id: contactInB2Chat.contact_id,
      });
      console.log(`Cliente ${customer.id} actualizado correctamente.`);
    } else {
      await createContact({ customer: customerData });
      console.log(`Cliente ${customer.id} creado correctamente.`);
    }
  }
});

contactQueue.on("failed", (job, error) => {
  console.error(`El trabajo de la cola contactQueue ${job.id} ha fallado, customer ${job.data.id}`, error);
});

//RETRY FAILED JOBS
async function retryFailedJobs() {
  try {
    const failedJobs = await contactQueue.getFailed();
    console.log(`Encountered ${failedJobs.length} failed jobs in contactQueue.`);

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
  "0 0 * * *",
  function () {
    retryFailedJobs();
  },
  null,
  true,
  "Europe/Madrid",
);
