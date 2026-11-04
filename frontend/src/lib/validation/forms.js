/**
 * Contact, volunteer and newsletter form rules (docs/API.md "Forms"). Contact and volunteer come in F2.
 */

import { z } from "zod";
import { emailField } from "./common";

export const subscriberSchema = z.object({
  email: emailField,
});
