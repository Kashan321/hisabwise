import { syncOrderStatusFromKitchenTickets } from '../../../src/modules/kitchen-display/application/services/kitchen-ticket.service';

describe('syncOrderStatusFromKitchenTickets', () => {
  it('does not downgrade completed orders', async () => {
    const orderUpdate = jest.fn();
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ status: 'COMPLETED' }),
        update: orderUpdate,
      },
      kitchenTicket: {
        findMany: jest.fn(),
      },
    };

    await syncOrderStatusFromKitchenTickets(tx as never, 'order-1');

    expect(orderUpdate).not.toHaveBeenCalled();
    expect(tx.kitchenTicket.findMany).not.toHaveBeenCalled();
  });
});
