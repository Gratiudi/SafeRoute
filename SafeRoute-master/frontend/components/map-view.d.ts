import type React from "react";
import type { ViewStyle } from "react-native";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type Region = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export interface MapViewProps {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  initialRegion?: Region;
  showsUserLocation?: boolean;
}

export interface MarkerProps {
  coordinate: Coordinate;
  title?: string;
}

export interface PolylineProps {
  coordinates: Coordinate[];
  strokeColor?: string;
  strokeWidth?: number;
}

export const MapView: React.ComponentType<MapViewProps>;
export const Marker: React.ComponentType<MarkerProps>;
export const Polyline: React.ComponentType<PolylineProps>;
