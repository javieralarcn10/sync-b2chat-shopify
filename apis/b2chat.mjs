import axios from "axios";
const usernameB2Chat = process.env.B2CHAT_USERNAME;
const passwordB2Chat = process.env.B2CHAT_PASSWORD;

async function getToken() {
  try {
    const response = await axios("https://api.b2chat.io/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        grant_type: "client_credentials",
      },
      auth: {
        username: usernameB2Chat,
        password: passwordB2Chat,
      },
    });
    const { access_token } = response.data;
    return access_token;
  } catch (error) {
    console.error("Error to get token B2Chat: ", error);
    throw error;
  }
}

async function createContactInB2Chat({ customer, token }) {
  try {
    const response = await axios("https://api.b2chat.io/contacts/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: {
        ...customer,
        contact: {
          ...customer.contact,
          email: customer.contact?.email || "",
        },
      },
    });
    const { data } = response;
    return data;
  } catch (error) {
    console.error("Error to create contact in B2Chat: ", error);
    throw error;
  }
}

async function updateContactInB2Chat({ customer, id, token }) {
  try {
    const response = await axios(`https://api.b2chat.io/contacts/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: { ...customer, fullName: customer?.fullname },
    });
    const { data } = response;
    return data;
  } catch (error) {
    console.error("Error to update contact in B2Chat: ", error);
    throw error;
  }
}

async function getContactInB2Chat({ customer, token }) {
  try {
    const response = await axios("https://api.b2chat.io/contacts/export", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: {
        filters: {
          contact_lookup: [
            {
              field: "mobile",
              value: customer?.contact?.mobile,
            },
            // {
            //   field: "email",
            //   value: customer?.contact?.email,
            // }, THIS NOT WORK IN B2CHAT
          ],
        },
      },
    });
    const { data } = response;
    if (data?.exported > 0 && data?.contacts[0].contact_id) {
      const contact = data?.contacts[0];
      return {
        contact_id: contact?.contact_id,
        fullName: contact?.fullname,
        identification: contact?.identification,
        email: contact?.email,
        landline: contact?.landline,
        mobile: contact?.mobile,
        address: contact?.address,
        country: contact?.country,
        city: contact?.city,
        company: contact?.company,
      };
    }
    return false;
  } catch (error) {
    console.error("Error to search contact in B2Chat: ", error);
    throw error;
  }
}

async function addTagsToContactInB2Chat({ customer, tags, token }) {
  try {
    const response = await axios(`https://api.b2chat.io/contacts/${customer}/tags?tag_actions=ASSIGN_TAG`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: tags.map((tag) => ({ name: tag })),
    });
    const { data } = response;
    return data;
  } catch (error) {
    console.error("Error to add tags to contact in B2Chat: ", error);
    throw error;
  }
}

async function removeTagsFromContactInB2Chat({ customer, tags, token }) {
  try {
    const response = await axios(`https://api.b2chat.io/contacts/${customer}/tags`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: tags.map((tag) => ({ name: tag })),
    });
    const { data } = response;
    return data;
  } catch (error) {
    console.error("Error to remove tags from contact in B2Chat: ", error);
    throw error;
  }
}

export async function createContact({ customer }) {
  const token = await getToken();
  const contact = await createContactInB2Chat({ customer, token });
  return contact;
}

export async function updateContact({ customer, id }) {
  const token = await getToken();
  const contact = await updateContactInB2Chat({ customer, id, token });
  return contact;
}

export async function addTagsToContact({ customer, tags }) {
  const token = await getToken();
  await addTagsToContactInB2Chat({ customer, tags, token });
}

export async function removeTagsFromContact({ customer, tags }) {
  const token = await getToken();
  await removeTagsFromContactInB2Chat({ customer, tags, token });
}

export async function getContact({ customer }) {
  const token = await getToken();
  const contact = await getContactInB2Chat({ customer, token });
  return contact;
}
