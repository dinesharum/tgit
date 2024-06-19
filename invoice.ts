import { TransactionTypes } from 'commonV3/utils';
import {
  Invoice,
  MagentoInvoice,
  MagentoOrderItem,
  Transaction,
} from '../types';
import { getOrderItemDiscount } from './order-item-utils';
import { isBrazilInvoice } from './invoice-utils';
import { DEFAULT_DECIMAL_POINTS_PRICE } from 'commonV3/constants';
import { logger } from 'commonV3/utils/logging';

export const shouldSkipInvoice = (invoice: MagentoInvoice) => {
  const invoiceTotalVal1 = getInvoiceTotalV1(invoice).toFixed(
    DEFAULT_DECIMAL_POINTS_PRICE
  );
  const invoiceTotalVal2 = getInvoiceTotalV2(invoice).toFixed(
    DEFAULT_DECIMAL_POINTS_PRICE
  );

  return (
    invoice.total_paid !== invoice.total_invoiced ||
    invoiceTotalVal1 !== invoiceTotalVal2
  );
};

export const isPaidLine = (invoice: Invoice) => {
  return invoice.payment.length > 0;
};

export const isOrderShipped = (orderItem: MagentoOrderItem) => {
  return Number(orderItem.qty_shipped) > 0;
};

export const shouldSkipTransaction = (
  transaction: Transaction,
  totalPaid?: number | null
) => {
  return transaction.txn_type !== TransactionTypes.Capture || totalPaid === 0;
};

export const getInvoiceTotalV1 = (invoice: MagentoInvoice): number => {
  if (invoice.customer_balance_invoiced) {
    const customerBalanceInvoiced = parseFloat(
      invoice.customer_balance_invoiced ?? ''
    );
    if (Number.isNaN(customerBalanceInvoiced)) {
      logger.warn(
        `customer_balance_invoiced is NaN for magento invoice with entity_id ${invoice.entity_id}`
      );
    }
    return (invoice.total_paid ?? 0) + customerBalanceInvoiced;
  } else {
    return invoice.total_paid ?? 0;
  }
};

export const getInvoiceTotalV2 = (invoice: MagentoInvoice): number => {
  const checkDiscountAmountVal = (invoice.discount_amount !== 0) ? getPositive(invoice.discount_amount) : getInvoiceDiscount(invoice); 
  
  const result =
    (invoice.subtotal_invoiced ?? 0) +
    (invoice.shipping_amount ?? 0) +
    (invoice.tax_invoiced ?? 0) -
    checkDiscountAmountVal;

  if (isBrazilInvoice(invoice)) {
    const chargedRate = parseFloat(invoice.charged_rate ?? '');
    if (Number.isNaN(chargedRate)) {
      logger.warn(
        `charget_rate is NaN for magento invoice with entity_id ${invoice.entity_id}`
      );
    }
    return result * chargedRate;
  }

  return result;
};

export const getInvoiceDiscount = (invoice: MagentoInvoice): number => {
  return (
    invoice.order_items?.reduce(
      (sum, orderItem) => sum + getOrderItemDiscount(orderItem),
      0
    ) ?? 0
  );
};

export const getPositive = (discountValue: number| null | undefined ): number => {
  return(
    (typeof discountValue === 'number')?(discountValue < 0 ? discountValue * -1 : discountValue) : 0
  );  
};
