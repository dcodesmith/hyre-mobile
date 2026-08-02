export type BookingActionPermissions = {
  canEdit: boolean;
  canCancel: boolean;
};

export type BookingActionVisibility = {
  showActions: boolean;
  showEdit: boolean;
  showCancel: boolean;
};

/**
 * Maps server booking eligibility flags to UI action visibility.
 * Edit and cancel are independent — do not derive one from the other.
 */
export function getBookingActionVisibility(
  permissions: BookingActionPermissions,
): BookingActionVisibility {
  const showEdit = permissions.canEdit === true;
  const showCancel = permissions.canCancel === true;

  return {
    showEdit,
    showCancel,
    showActions: showEdit || showCancel,
  };
}
