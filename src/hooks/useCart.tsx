import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";
import { LOCAL_STORAGE_CART_KEY } from "../util/constants";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function updateCart(updatedCart: Product[]) {
    setCart(updatedCart);
    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(updatedCart));
  }

  const addProduct = async (productId: number) => {
    try {
      // cart check
      const updatedCart = [...cart];
      const productInCart = updatedCart.find(
        (product) => product.id === productId
      );
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (productInCart) {
        if (productInCart.amount + 1 > stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        productInCart.amount += 1;
      } else {
        const { data: product } = await api.get<Product>(
          `products/${productId}`
        );
        updatedCart.push({ ...product, amount: 1 });
      }

      updateCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndexInCart = cart.findIndex(
        (product) => product.id === productId
      );

      if (productIndexInCart >= 0) {
        const updatedCart = cart.filter((product) => product.id !== productId);
        updateCart(updatedCart);
      } else {
        throw new Error("not found");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const { data: productStock } = await api.get<Stock>(`stock/${productId}`);
      if (amount > productStock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];
      const productInCart = updatedCart.find(
        (product) => product.id === productId
      );
      if (productInCart) {
        productInCart.amount = amount;
        updateCart(updatedCart);
      } else {
        throw new Error("not found");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
