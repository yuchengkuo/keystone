import { integer, text, relationship, virtual } from '@keystone-next/keystone/fields';
import { list } from '@keystone-next/keystone';
import { schema } from '@keystone-next/keystone/types';
import { isSignedIn, rules } from '../access';
import formatMoney from '../lib/formatMoney';

export const Order = list({
  access: {
    create: isSignedIn,
    read: rules.canOrder,
    update: () => false,
    delete: () => false,
  },
  fields: {
    label: virtual({
      field: schema.field({
        type: schema.String,
        resolve(item) {
          return `${formatMoney((item as any).total)}`;
        },
      }),
    }),
    total: integer(),
    items: relationship({ ref: 'OrderItem.order', many: true }),
    user: relationship({ ref: 'User.orders' }),
    charge: text(),
  },
});
