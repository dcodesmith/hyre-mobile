import {
  ConnectedStops,
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import type { BookingDetail } from "@/services/bookings";
import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";

function LocationStop({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium leading-5 text-gray-500">{label}</Text>
      <Text selectable className="text-sm font-medium leading-6 text-gray-900">
        {value}
      </Text>
    </View>
  );
}

export function BookingLocationCard({ booking }: { readonly booking: BookingDetail }) {
  return (
    <DetailCard>
      <DetailCardHeader>
        <DetailCardIcon>
          <MapPin size={24} color="#111827" />
        </DetailCardIcon>
        <DetailCardTitle>Location Details</DetailCardTitle>
      </DetailCardHeader>
      <DetailCardBody>
        <ConnectedStops
          first={<LocationStop label="Pickup location" value={booking.pickupLocation} />}
          second={
            <LocationStop label="Drop-off location" value={booking.returnLocation} />
          }
        />
      </DetailCardBody>
    </DetailCard>
  );
}
