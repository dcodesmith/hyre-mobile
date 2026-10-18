import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil } from "lucide-react-native";
import { useRef, useState } from "react";
import { Modal, Pressable, Text, useWindowDimensions, View } from "react-native";

export function BookingDetailActions({
  canEdit,
  canCancel,
  disabled,
  onEdit,
  onCancel,
}: {
  readonly canEdit: boolean;
  readonly canCancel: boolean;
  readonly disabled: boolean;
  readonly onEdit: () => void;
  readonly onCancel: () => void;
}) {
  const menuAnchor = useRef<View>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; width: number } | null>(
    null,
  );
  const { width: windowWidth } = useWindowDimensions();

  function openMenu() {
    menuAnchor.current?.measureInWindow((x, y, width, height) => {
      if (width === 0) return;
      setMenu({ x, y: y + height + 4, width });
    });
  }

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {canEdit ? (
        <Button
          className="h-12 rounded-md px-4"
          disabled={disabled}
          onPress={onEdit}
        >
          <Pencil size={16} color="#FAFAFA" />
          <Text className="text-sm font-medium text-primary-foreground">
            Edit Booking
          </Text>
        </Button>
      ) : null}
      {canCancel ? (
        <View ref={menuAnchor} collapsable={false}>
          <Button
            variant="outline"
            accessibilityLabel="Booking actions"
            className="h-12 w-12 border-gray-200 bg-white p-1"
            disabled={disabled}
            onPress={openMenu}
          >
            <MoreHorizontal size={16} color="#111827" />
          </Button>
          <Modal
            visible={menu != null}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => setMenu(null)}
          >
            <View className="flex-1">
              <Pressable className="absolute inset-0" onPress={() => setMenu(null)} />
              {menu ? (
                <Pressable
                  accessibilityRole="menuitem"
                  disabled={disabled}
                  onPress={() => {
                    setMenu(null);
                    onCancel();
                  }}
                  style={{
                    position: "absolute",
                    top: menu.y,
                    left: Math.max(8, menu.x + menu.width - 160),
                    width: Math.min(160, windowWidth - 16),
                  }}
                  className="rounded-lg border border-gray-200 bg-white p-1 shadow-md"
                >
                  <Text className="rounded-md px-1.5 py-1 text-sm text-destructive">
                    Cancel Booking
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Modal>
        </View>
      ) : null}
    </View>
  );
}
