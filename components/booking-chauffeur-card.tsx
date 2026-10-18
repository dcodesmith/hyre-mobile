import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIcon,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import type { BookingDetail } from "@/services/bookings";
import { Image } from "expo-image";
import { User } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";

function chauffeurInitials(name: string | null | undefined) {
  if (!name) return "NA";
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("") || "NA"
  );
}

export function BookingChauffeurCard({ booking }: { readonly booking: BookingDetail }) {
  const name = booking.chauffeur?.name || "Not Assigned";
  const image = booking.chauffeur?.image;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const showImage = Boolean(image) && failedImage !== image;

  return (
    <DetailCard>
      <DetailCardHeader>
        <DetailCardIcon>
          <User size={24} color="#111827" />
        </DetailCardIcon>
        <DetailCardTitle>Chauffeur</DetailCardTitle>
      </DetailCardHeader>
      <DetailCardBody>
        <View className="flex-row items-center gap-3">
          {showImage && image ? (
            <Image
              source={image}
              contentFit="cover"
              accessibilityLabel={`${name} profile`}
              onError={() => setFailedImage(image)}
              className="h-[50px] w-[50px] rounded-full bg-gray-100"
            />
          ) : (
            <View className="h-[50px] w-[50px] items-center justify-center rounded-full bg-gray-100">
              <Text className="text-sm font-medium text-gray-900">
                {chauffeurInitials(booking.chauffeur?.name)}
              </Text>
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text selectable className="text-sm font-medium leading-6 text-gray-900">
              {name}
            </Text>
            <Text className="text-sm font-medium leading-5 text-gray-500">
              Professional Chauffeur
            </Text>
          </View>
        </View>
      </DetailCardBody>
    </DetailCard>
  );
}
