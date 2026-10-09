import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollView, useWindowDimensions } from "react-native";
import { BookingSearch } from "./BookingSearch";

interface SearchModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Full-screen search modal - opens when user taps CompactSearchBar
 */
export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const { height } = useWindowDimensions();
  const modalMaxHeight = height * 0.85;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full">
        <ScrollView
          style={{ maxHeight: modalMaxHeight }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BookingSearch
            onSearchComplete={() => onOpenChange(false)}
          />
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}
