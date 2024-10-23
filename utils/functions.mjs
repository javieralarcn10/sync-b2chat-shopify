import { getCountryDialCodeFromCountryCodeOrNameOrFlagEmoji } from "country-codes-flags-phone-codes";

export function limitString(input, limit = 200) {
    if (!input) return ''
    let str = input.toString();

    if (str.length > limit) {
        return str.slice(0, limit) + "...";
    }
    return str;
}

export function formatPhoneNumber({ number, countryCode }) {
    const countryCallingCode = getCountryDialCodeFromCountryCodeOrNameOrFlagEmoji(countryCode.toUpperCase());

    if (!countryCallingCode) {
        throw new Error(`Invalid or unsupported country code: ${countryCode}`);
    }

    let numberWithoutSpaces = number.replace(/\s+/g, '');

    if (!numberWithoutSpaces.startsWith('+')) {
        numberWithoutSpaces = countryCallingCode + numberWithoutSpaces;
    }

    return numberWithoutSpaces;
}

export function removeGidPrefix(gid) {
    return gid.replace('gid://shopify/Customer/', '');
}

export function mapCustomersFromShopify({ shopifyCustomers }) {
    return shopifyCustomers.map(customer => ({
        id: removeGidPrefix(customer.id),
        first_name: customer.firstName,
        last_name: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        default_address: customer.defaultAddress ? {
            address1: customer.defaultAddress.address1,
            address2: customer.defaultAddress.address2,
            city: customer.defaultAddress.city,
            phone: customer.defaultAddress.phone,
            country_code: customer.defaultAddress.countryCodeV2,
        } : null,
    }))
}