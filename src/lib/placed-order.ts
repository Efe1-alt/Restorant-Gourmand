import type { Fulfillment, Payment } from "./ordering";

// Поръчката, както я връща /api/order — с цени, преизчислени на сървъра.
export type PlacedOrder = {
  number: string;
  createdAt: string;
  items: {
    id: string;
    name: string;
    weight: string;
    quantity: number;
    // в центове
    price: number;
    lineTotal: number;
  }[];
  subtotalCents: number;
  // null = цената на доставката още не е потвърдена (уточнява се по телефона)
  deliveryCents: number | null;
  totalCents: number;
  fulfillment: Fulfillment;
  name: string;
  phone: string;
  address: string;
  time: string;
  timeLabel: string;
  note: string;
  payment: Payment;
};

// Последната изпратена поръчка се пази в sessionStorage, за да я покаже
// страницата „Благодарим!“.
export const LAST_ORDER_KEY = "gourmand-last-order";
