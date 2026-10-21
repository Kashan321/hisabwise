export class SupplierNotFoundError extends Error {
  constructor(message = 'Supplier not found') {
    super(message);
    this.name = 'SupplierNotFoundError';
  }
}

export class SupplierNameTakenError extends Error {
  constructor(message = 'A supplier with this name already exists') {
    super(message);
    this.name = 'SupplierNameTakenError';
  }
}
