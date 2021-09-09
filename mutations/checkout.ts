import { KeystoneContext } from "@keystone-next/types";
import {
  CartItemCreateInput,
  OrderCreateInput,
} from "../.keystone/schema-types";
import StripeConfig from "../lib/stripe";

interface Arguments {
  token: string;
}

async function checkout(
  root: any,
  { token }: Arguments,
  context: KeystoneContext
): Promise<OrderCreateInput> {
  //check signed in
  const userId = context.session.itemId;

  if (!userId) {
    throw new Error("Sorry! You must be signed in");
  }
  const user = await context.lists.User.findOne({
    where: { id: userId },
    resolveFields: `
            id
            name
            email
            cart {
                id
                quantity
                product {
                    name
                    price
                    description
                    id
                    photo {
                        id
                        image {
                            id
                            publicUrlTransformed
                        }
                    }
                }
            }
        `,
  });

  //calc total price for
  const cartItems = user.cart.filter((cartItem) => cartItem.product);

  const amount = cartItems.reduce(function (
    tally: number,
    cartItem: CartItemCreateInput
  ) {
    return tally + cartItem.quantity * cartItem.product.price;
  },
  0);

  // 3. create the charge with the stripe library
  const charge = await StripeConfig.paymentIntents
    .create({
      amount,
      currency: "INR",
      confirm: true,
      payment_method: token,
    })
    .catch((err) => {
      console.log(err);
      throw new Error(err.message);
    });
  // 4. Convert the cartItems to OrderItems
  const orderItems = cartItems.map((cartItem) => {
    const orderItem = {
      name: cartItem.product.name,
      description: cartItem.product.description,
      price: cartItem.product.price,
      quantity: cartItem.quantity,
      photo: { connect: { id: cartItem.product.photo.id } },
    };
    return orderItem;
  });
  console.log("gonna create the order");
  // 5. Create the order and return it
  const order = await context.lists.Order.createOne({
    data: {
      total: charge.amount,
      charge: charge.id,
      items: { create: orderItems },
      user: { connect: { id: userId } },
    },
    resolveFields: false,
  });
  // 6. Clean up any old cart item
  const cartItemIds = user.cart.map((cartItem) => cartItem.id);
  console.log("gonna create delete cartItems");
  await context.lists.CartItem.deleteMany({
    ids: cartItemIds,
  });
  return order;
}

export default checkout;
