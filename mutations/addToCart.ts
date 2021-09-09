import { KeystoneContext } from "@keystone-next/types";
import { CartItemCreateInput } from "../.keystone/schema-types";
import { Session } from "../types";
async function addToCart(
  root: any,
  { productId }: { productId: string },
  context: KeystoneContext
): Promise<CartItemCreateInput> {
  //query current user check if signed in
  const ses = context.session as Session;
  if (!ses.itemId) {
    throw new Error("You must be logged in to do this");
  }
  //query current user cart
  const allCartItems = await context.lists.CartItem.findMany({
    where: { user: { id: ses.itemId }, product: { id: productId } },
    resolveFields: "id,quantity",
  });

  //check if item in cart
  //icrement if found
  const [existingCartItem] = allCartItems;
  if (existingCartItem) {
    return await context.lists.CartItem.updateOne({
      id: existingCartItem.id,
      data: { quantity: existingCartItem.quantity + 1 },
    });
  }
  //else create new cart item
  return await context.lists.CartItem.createOne({
    data: {
      product: { connect: { id: productId } },
      user: { connect: { id: ses.itemId } },
    },
  });
}

export default addToCart;
