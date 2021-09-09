import Stripe from "stripe";

const StripeConfig = new Stripe(process.env.STRIPE_SECRET || "", {
  apiVersion: "2020-08-27",
});

export default StripeConfig;
