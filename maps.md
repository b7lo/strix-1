A library that provides access to Google Maps on Android and Apple Maps on iOS.

Ask AI

Bundled version:
~55.0.18

Copy page

For the complete documentation index, see llms.txt. Use this file to discover all available pages.

This library is currently in alpha and will frequently experience breaking changes. It is not available in the Expo Go app – use development builds to try it out.
Installation
Terminal

Copy

npx expo install expo-maps
If you are installing this in an existing React Native app, make sure to install expo in your project.

Watch: Expo Maps Deep Dive
Watch: Expo Maps Deep Dive
Add Google Maps and Apple Maps to your Expo app with the expo-maps library.

Configuration
Expo Maps provides access to the platform native map APIs on Android and iOS.

Apple Maps (available on
only). No additional configuration is required to use it after installing this package.
Google Maps (available on
only). While Google provides a Google Maps SDK for iOS, Expo Maps supports it exclusively on Android. If you want to use Google Maps on iOS, you can look into using an alternative library or writing your own.
Google Cloud API setup
Before you can use Google Maps on Android, you need to register a Google Cloud API project, enable the Maps SDK for Android, and add the associated configuration to your Expo project.

Set up Google Maps on Android

Permissions
To display the user's location on the map, you need to declare and request location permission beforehand. You can configure this using its built-in config plugin if you use config plugins in your project (Continuous Native Generation (CNG)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does not use CNG, then you'll need to manually configure the library.

Example app.json with config plugin
app.json

Copy

{
"expo": {
"plugins": [
[
"expo-maps",
{
"requestLocationPermission": true,
"locationPermission": "Allow $(PRODUCT_NAME) to use your location"
}
]
]
}
}
Configurable properties
Name Default Description
requestLocationPermission false
A boolean to add permissions to AndroidManifest.xml and Info.plist.

locationPermission "Allow $(PRODUCT_NAME) to use your location"
Only for: 

A string to set the NSLocationWhenInUseUsageDescription permission message.

Usage
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, Text } from 'react-native';

export default function App() {
if (Platform.OS === 'ios') {
return <AppleMaps.View style={{ flex: 1 }} />;
} else if (Platform.OS === 'android') {
return <GoogleMaps.View style={{ flex: 1 }} />;
} else {
return <Text>Maps are only available on Android and iOS</Text>;
}
}
API
import { AppleMaps, GoogleMaps } from 'expo-maps';

// AppleMaps.View and GoogleMaps.View are the React components
Components
AppleMapsView
Type: React.Element<Component<Omit<AppleMapsViewProps, 'ref'>>>

AppleMapsViewProps

annotations
Optional • Type: AppleMapsAnnotation[]
The array of annotations to display on the map.

cameraPosition
Optional • Type: CameraPosition
The initial camera position of the map.

circles
Optional • Type: AppleMapsCircle[]
The array of circles to display on the map.

colorScheme
Optional • Type: AppleMapsColorScheme • Default: AppleMapsColorScheme.AUTOMATIC
Controls the color scheme (appearance) of the map. Use this to force the map to display in light or dark mode.

markers
Optional • Type: AppleMapsMarker[]
The array of markers to display on the map.

onAnnotationClick
Optional • Type: (event: AppleMapsAnnotation) => void
Lambda invoked when the annotation is clicked.

onCameraMove
Optional • Type: (event: CameraMoveEvent) => void
Lambda invoked when the map was moved by the user. Also runs once on initial mount with the starting viewport.

onCircleClick
Optional • Type: (event: AppleMapsCircle) => void
Lambda invoked when the circle is clicked.

onMapClick
Optional • Type: (event: { coordinates: Coordinates }) => void
Lambda invoked when the user clicks on the map. It won't be invoked if the user clicks on POI or a marker.

onMarkerClick
Optional • Type: (event: AppleMapsMarker) => void
Lambda invoked when the marker is clicked.

onPolygonClick
Optional • Type: (event: AppleMapsPolygon) => void
Lambda invoked when the polygon is clicked.

onPolylineClick
Optional • Type: (event: AppleMapsPolyline) => void
Lambda invoked when the polyline is clicked.

polygons
Optional • Type: AppleMapsPolygon[]
The array of polygons to display on the map.

polylines
Optional • Type: AppleMapsPolyline[]
The array of polylines to display on the map.

properties
Optional • Type: AppleMapsProperties
The properties for the map.

ref
Optional • Type: Ref<AppleMapsViewType>
style
Optional • Type: StyleProp<ViewStyle>
uiSettings
Optional • Type: AppleMapsUISettings
The MapUiSettings to be used for UI-specific settings on the map.

GoogleMapsView
Type: React.Element<Component<Omit<GoogleMapsViewProps, 'ref'>>>

GoogleMapsViewProps

cameraPosition
Optional • Type: CameraPosition
The initial camera position of the map.

circles
Optional • Type: GoogleMapsCircle[]
The array of circles to display on the map.

colorScheme
Optional • Type: GoogleMapsColorScheme
Defines the color scheme for the map.

contentPadding
Optional • Type: GoogleMapsContentPadding
The padding values used to signal that portions of the map around the edges may be obscured. The map will move the Google logo, etc. to avoid overlapping the padding.

mapOptions
Optional • Type: GoogleMapsMapOptions
Defines configuration GoogleMapOptions for a GoogleMap

markers
Optional • Type: GoogleMapsMarker[]
The array of markers to display on the map.

onCameraMove
Optional • Type: (event: CameraMoveEvent) => void
Lambda invoked when the map was moved by the user. Also runs once on initial mount with the starting viewport.

onCircleClick
Optional • Type: (event: GoogleMapsCircle) => void
Lambda invoked when the circle is clicked.

onMapClick
Optional • Type: (event: { coordinates: Coordinates }) => void
Lambda invoked when the user clicks on the map. It won't be invoked if the user clicks on POI or a marker.

onMapLoaded
Optional • Type: () => void
Lambda invoked when the map is loaded.

onMapLongClick
Optional • Type: (event: { coordinates: Coordinates }) => void
Lambda invoked when the user long presses on the map.

onMarkerClick
Optional • Type: (event: GoogleMapsMarker) => void
Lambda invoked when the marker is clicked

onPOIClick
Optional • Type: (event: { coordinates: Coordinates, name: string }) => void
Lambda invoked when a POI is clicked.

onPolygonClick
Optional • Type: (event: GoogleMapsPolygon) => void
Lambda invoked when the polygon is clicked.

onPolylineClick
Optional • Type: (event: GoogleMapsPolyline) => void
Lambda invoked when the polyline is clicked.

polygons
Optional • Type: GoogleMapsPolygon[]
The array of polygons to display on the map.

polylines
Optional • Type: GoogleMapsPolyline[]
The array of polylines to display on the map.

properties
Optional • Type: GoogleMapsProperties
The properties for the map.

ref
Optional • Type: Ref<GoogleMapsViewType>
style
Optional • Type: StyleProp<ViewStyle>
uiSettings
Optional • Type: GoogleMapsUISettings
The MapUiSettings to be used for UI-specific settings on the map.

userLocation
Optional • Type: GoogleMapsUserLocation
User location, overrides default behavior.

GoogleStreetView
Type: React.Element<GoogleStreetViewProps>

GoogleStreetViewProps

isPanningGesturesEnabled
Optional • Type: boolean
isStreetNamesEnabled
Optional • Type: boolean
isUserNavigationEnabled
Optional • Type: boolean
isZoomGesturesEnabled
Optional • Type: boolean
position
Type: StreetViewCameraPosition
style
Optional • Type: StyleProp<ViewStyle>
Hooks
useLocationPermissions(options)
Parameter Type
options
(optional)
PermissionHookOptions<object>

Check or request permissions to access the location. This uses both requestPermissionsAsync and getPermissionsAsync to interact with the permissions.

Returns:
[PermissionResponse | null, RequestPermissionMethod<PermissionResponse>, GetPermissionMethod<PermissionResponse>]
Example

const [status, requestPermission] = useLocationPermissions();
Methods
Maps.getPermissionsAsync()
Returns:
Promise<PermissionResponse>
Maps.requestPermissionsAsync()
Returns:
Promise<PermissionResponse>
Types
AppleMapsAnnotation
Type: AppleMapsMarker extended by:

Property Type Description
backgroundColor
(optional)
string
The background color of the annotation.

icon
(optional)
SharedRefType<'image'>
The custom icon to display in the annotation.

text
(optional)
string
The text to display in the annotation.

textColor
(optional)
string
The text color of the annotation.

AppleMapsCircle
Property Type Description
center Coordinates
The coordinates of the circle.

color
(optional)
ProcessedColorValue | string
The color of the circle.

id
(optional)
string
The unique identifier for the circle. This can be used to identify the clicked circle in the onCircleClick event.

lineColor
(optional)
ProcessedColorValue | string
The color of the circle line.

lineWidth
(optional)
number
The width of the circle line.

radius number
The radius of the circle (in meters).

width
(optional)
number
The width of the circle.

AppleMapsMarker
Property Type Description
coordinates
(optional)
Coordinates
The coordinates of the marker.

id
(optional)
string
The unique identifier for the marker. This can be used to identify the clicked marker in the onMarkerClick event.

monogram
(optional)
string
Only for: 

A short text (typically initials or 1-2 characters) to display on the marker balloon. This is mutually exclusive with systemImage. If both are provided, systemImage takes precedence.

systemImage
(optional)
string
The SF Symbol to display for the marker. This is mutually exclusive with monogram. If both are provided, systemImage takes precedence.

tintColor
(optional)
string
The tint color of the marker.

title
(optional)
string
The title of the marker, displayed in the callout when the marker is clicked.

AppleMapsPointOfInterestCategories
Property Type Description
excluding
(optional)
AppleMapPointOfInterestCategory[]
The POI categories to exclude. To show all POIs, set this to an empty array.

including
(optional)
AppleMapPointOfInterestCategory[]
The POI categories to include. To hide all POIs, set this to an empty array.

AppleMapsPolygon
Property Type Description
color
(optional)
ProcessedColorValue | string
The color of the polygon.

coordinates Coordinates[]
The coordinates of the circle.

id
(optional)
string
The unique identifier for the polygon. This can be used to identify the clicked polygon in the onPolygonClick event.

lineColor
(optional)
ProcessedColorValue | string
The color of the polygon.

lineWidth
(optional)
number
The width of the polygon.

AppleMapsPolyline
Property Type Description
color
(optional)
ProcessedColorValue | string
The color of the polyline.

contourStyle
(optional)
AppleMapsContourStyle
The style of the polyline.

coordinates Coordinates[]
The coordinates of the polyline.

id
(optional)
string
The unique identifier for the polyline. This can be used to identify the clicked polyline in the onPolylineClick event.

width
(optional)
number
The width of the polyline.

AppleMapsProperties
Property Type Description
elevation
(optional)
AppleMapsMapStyleElevation
Values you use to determine whether a map renders elevation.

emphasis
(optional)
AppleMapsMapStyleEmphasis
Values that control how the framework emphasizes map features.

isMyLocationEnabled
(optional)
boolean
Whether the user location is shown on the map.

Default:
false
isTrafficEnabled
(optional)
boolean
Whether the traffic layer is enabled on the map.

mapType
(optional)
AppleMapsMapType
Defines which map type should be used.

pointsOfInterest
(optional)
AppleMapsPointOfInterestCategories
A structure you use to define points of interest to include or exclude on a map.

polylineTapThreshold
(optional)
number
The maximum distance in meters from a tap of a polyline for it to be considered a hit. If the distance is greater than the threshold, the polyline is not considered a hit. If a hit occurs, the onPolylineClick event will be triggered. Defaults to 20 meters.

selectionEnabled
(optional)
boolean
If true, the user can select a location on the map to get more information.

AppleMapsUISettings
Property Type Description
compassEnabled
(optional)
boolean
Whether the compass is enabled on the map. If enabled, the compass is only visible when the map is rotated.

myLocationButtonEnabled
(optional)
boolean
Whether the my location button is visible.

scaleBarEnabled
(optional)
boolean
Whether the scale bar is displayed when zooming.

togglePitchEnabled
(optional)
boolean
Whether the user is allowed to change the pitch type.

AppleMapsViewType
Property Type Description
openLookAroundAsync (coordinates: Coordinates) => Promise<void>
Opens the look around view at specified coordinates.

coordinates: Coordinates
The coordinates of the location to open the look around view at.

selectAnnotation (id: string, options: { moveCamera: boolean, zoom: number }) => void
Only for: 

Programmatically select an annotation by its ID.

id: string
The ID of the annotation to select, or undefined to clear selection.

options: { moveCamera: boolean, zoom: number }
Optional configuration for the selection.

selectMarker (id: string, options: { moveCamera: boolean, zoom: number }) => void
Only for: 

Programmatically select a marker by its ID.

id: string
The ID of the marker to select, or undefined to clear selection.

options: { moveCamera: boolean, zoom: number }
Optional configuration for the selection.

setCameraPosition (config: CameraPosition) => void
Update camera position. Animation duration is not supported on iOS.

config: CameraPosition
New camera postion.

CameraMoveEvent
The event payload for the onCameraMove callback on AppleMaps.View and GoogleMaps.View.

Property Type Description
bearing number
The bearing of the camera in degrees.

coordinates Coordinates
The coordinates of the camera center.

latitudeDelta number
The height of the visible region in degrees of latitude

longitudeDelta number
The width of the visible region in degrees of longitude

tilt number
The tilt of the camera in degrees.

zoom number
The zoom level of the camera.

CameraPosition
Property Type Description
coordinates
(optional)
Coordinates
The middle point of the camera.

zoom
(optional)
number
The zoom level of the camera. For some view sizes, lower zoom levels might not be available.

Coordinates
Property Type Description
latitude
(optional)
number
The latitude of the coordinate.

longitude
(optional)
number
The longitude of the coordinate.

GoogleMapsAnchor
Property Type Description
x number
The normalized horizontal anchor point from 0.0 (left edge) to 1.0 (right edge).

y number
The normalized vertical anchor point from 0.0 (top edge) to 1.0 (bottom edge).

GoogleMapsCircle
Property Type Description
center Coordinates
The coordinates of the circle.

clickCoordinates
(optional)
Coordinates
The geographic coordinates of the click point on the map.

color
(optional)
ProcessedColorValue | string
The color of the circle.

id
(optional)
string
The unique identifier for the circle. This can be used to identify the clicked circle in the onCircleClick event.

lineColor
(optional)
ProcessedColorValue | string
The color of the circle line.

lineWidth
(optional)
number
The width of the circle line.

radius number
The radius of the circle.

GoogleMapsContentPadding
Property Type Description
bottom
(optional)
number
The padding on the bottom side of the map.

end
(optional)
number
In LTR contexts, end will be applied along the right edge. In RTL contexts, end will correspond to the left edge.

start
(optional)
number
In LTR contexts, start will be applied along the left edge. In RTL contexts, start will correspond to the right edge.

top
(optional)
number
The padding on the top side of the map.

GoogleMapsMapOptions
Property Type Description
mapId
(optional)
string
A map ID is a unique identifier that represents Google Map styling and configuration settings that are stored in Google Cloud.

See: For more information, see https://developers.google.com/maps/documentation/android-sdk/map-ids/mapid-over

GoogleMapsMapStyleOptions
Property Type Description
json string
The JSON string of the map style options.

See: For creating map style options, see https://mapstyle.withgoogle.com/

GoogleMapsMarker
Property Type Description
anchor
(optional)
GoogleMapsAnchor
The anchor used to position the anchor relative to its coordinates.

Default:
bottom-center of the icon
coordinates
(optional)
Coordinates
The coordinates of the marker.

draggable
(optional)
boolean
Whether the marker is draggable.

icon
(optional)
SharedRefType<'image'>
The custom icon to display for the marker.

id
(optional)
string
The unique identifier for the marker. This can be used to identify the clicked marker in the onMarkerClick event.

showCallout
(optional)
boolean
Whether the callout should be shown when the marker is clicked.

snippet
(optional)
string
The snippet of the marker, displayed in the callout when the marker is clicked.

title
(optional)
string
The title of the marker, displayed in the callout when the marker is clicked.

zIndex
(optional)
number
The z-index to use for the marker.

Default:
0
GoogleMapsPolygon
Property Type Description
color
(optional)
ProcessedColorValue | string
The color of the polygon.

coordinates Coordinates[]
The coordinates of the circle.

id
(optional)
string
The unique identifier for the polygon. This can be used to identify the clicked polygon in the onPolygonClick event.

lineColor
(optional)
ProcessedColorValue | string
The color of the polygon.

lineWidth
(optional)
number
The width of the polygon.

GoogleMapsPolyline
Property Type Description
color
(optional)
ProcessedColorValue | string
The color of the polyline.

coordinates Coordinates[]
The coordinates of the polyline.

geodesic
(optional)
boolean
Whether the polyline is geodesic.

id
(optional)
string
The unique identifier for the polyline. This can be used to identify the clicked polyline in the onPolylineClick event.

width
(optional)
number
The width of the polyline.

GoogleMapsProperties
Property Type Description
isBuildingEnabled
(optional)
boolean
Whether the building layer is enabled on the map.

isIndoorEnabled
(optional)
boolean
Whether the indoor layer is enabled on the map.

isMyLocationEnabled
(optional)
boolean
Whether finding the user's location is enabled on the map.

isTrafficEnabled
(optional)
boolean
Whether the traffic layer is enabled on the map.

mapStyleOptions
(optional)
GoogleMapsMapStyleOptions
With style options you can customize the presentation of the standard Google map styles, changing the visual display of features like roads, parks, and other points of interest.

mapType
(optional)
GoogleMapsMapType
Defines which map type should be used.

maxZoomPreference
(optional)
number
The maximum zoom level for the map.

minZoomPreference
(optional)
number
The minimum zoom level for the map.

selectionEnabled
(optional)
boolean
If true, the user can select a location on the map to get more information.

GoogleMapsUISettings
Property Type Description
compassEnabled
(optional)
boolean
Whether the compass is enabled on the map. If enabled, the compass is only visible when the map is rotated.

indoorLevelPickerEnabled
(optional)
boolean
Whether the indoor level picker is enabled .

mapToolbarEnabled
(optional)
boolean
Whether the map toolbar is visible.

myLocationButtonEnabled
(optional)
boolean
Whether the my location button is visible.

rotationGesturesEnabled
(optional)
boolean
Whether rotate gestures are enabled.

scaleBarEnabled
(optional)
boolean
Whether the scale bar is displayed when zooming.

scrollGesturesEnabled
(optional)
boolean
Whether the scroll gestures are enabled.

scrollGesturesEnabledDuringRotateOrZoom
(optional)
boolean
Whether the scroll gestures are enabled during rotation or zoom.

tiltGesturesEnabled
(optional)
boolean
Whether the tilt gestures are enabled.

togglePitchEnabled
(optional)
boolean
Whether the user is allowed to change the pitch type.

zoomControlsEnabled
(optional)
boolean
Whether the zoom controls are visible.

zoomGesturesEnabled
(optional)
boolean
Whether the zoom gestures are enabled.

GoogleMapsUserLocation
Property Type Description
coordinates Coordinates
User location coordinates.

followUserLocation boolean
Should the camera follow the users' location.

GoogleMapsViewType
Property Type Description
selectMarker (id: string, options: { moveCamera: boolean, zoom: number }) => Promise<void>
This is an async operation that animates the camera to the marker. If called rapidly, a previous animation may be cancelled, causing the returned promise to reject.

id: string
The ID of the marker to select, or undefined to clear selection.

options: { moveCamera: boolean, zoom: number }
Optional configuration for the selection.

setCameraPosition (config: SetCameraPositionConfig) => void
Update camera position.

config: SetCameraPositionConfig
New camera position config.

SetCameraPositionConfig
Type: CameraPosition extended by:

Property Type Description
duration
(optional)
number
The duration of the animation in milliseconds.

StreetViewCameraPosition
Property Type Description
bearing
(optional)
number

- coordinates Coordinates
- tilt
  (optional)
  number
- zoom
  (optional)
  number
- Enums
  AppleMapPointOfInterestCategory
  See: https://developer.apple.com/documentation/mapkit/AppleMapPointOfInterestCategory

AIRPORT
AppleMapPointOfInterestCategory.AIRPORT ＝ "AIRPORT"
AMUSEMENT_PARK
AppleMapPointOfInterestCategory.AMUSEMENT_PARK ＝ "AMUSEMENT_PARK"
ANIMAL_SERVICE
AppleMapPointOfInterestCategory.ANIMAL_SERVICE ＝ "ANIMAL_SERVICE"
AQUARIUM
AppleMapPointOfInterestCategory.AQUARIUM ＝ "AQUARIUM"
ATM
AppleMapPointOfInterestCategory.ATM ＝ "ATM"
AUTOMOTIVE_REPAIR
AppleMapPointOfInterestCategory.AUTOMOTIVE_REPAIR ＝ "AUTOMOTIVE_REPAIR"
BAKERY
AppleMapPointOfInterestCategory.BAKERY ＝ "BAKERY"
BANK
AppleMapPointOfInterestCategory.BANK ＝ "BANK"
BASEBALL
AppleMapPointOfInterestCategory.BASEBALL ＝ "BASEBALL"
BASKETBALL
AppleMapPointOfInterestCategory.BASKETBALL ＝ "BASKETBALL"
BEACH
AppleMapPointOfInterestCategory.BEACH ＝ "BEACH"
BEAUTY
AppleMapPointOfInterestCategory.BEAUTY ＝ "BEAUTY"
BOWLING
AppleMapPointOfInterestCategory.BOWLING ＝ "BOWLING"
BREWERY
AppleMapPointOfInterestCategory.BREWERY ＝ "BREWERY"
CAFE
AppleMapPointOfInterestCategory.CAFE ＝ "CAFE"
CAMPGROUND
AppleMapPointOfInterestCategory.CAMPGROUND ＝ "CAMPGROUND"
CAR_RENTAL
AppleMapPointOfInterestCategory.CAR_RENTAL ＝ "CAR_RENTAL"
CASTLE
AppleMapPointOfInterestCategory.CASTLE ＝ "CASTLE"
CONVENTION_CENTER
AppleMapPointOfInterestCategory.CONVENTION_CENTER ＝ "CONVENTION_CENTER"
DISTILLERY
AppleMapPointOfInterestCategory.DISTILLERY ＝ "DISTILLERY"
EV_CHARGER
AppleMapPointOfInterestCategory.EV_CHARGER ＝ "EV_CHARGER"
FAIRGROUND
AppleMapPointOfInterestCategory.FAIRGROUND ＝ "FAIRGROUND"
FIRE_STATION
AppleMapPointOfInterestCategory.FIRE_STATION ＝ "FIRE_STATION"
FISHING
AppleMapPointOfInterestCategory.FISHING ＝ "FISHING"
FITNESS_CENTER
AppleMapPointOfInterestCategory.FITNESS_CENTER ＝ "FITNESS_CENTER"
FOOD_MARKET
AppleMapPointOfInterestCategory.FOOD_MARKET ＝ "FOOD_MARKET"
FORTRESS
AppleMapPointOfInterestCategory.FORTRESS ＝ "FORTRESS"
GAS_STATION
AppleMapPointOfInterestCategory.GAS_STATION ＝ "GAS_STATION"
GO_KART
AppleMapPointOfInterestCategory.GO_KART ＝ "GO_KART"
GOLF
AppleMapPointOfInterestCategory.GOLF ＝ "GOLF"
HIKING
AppleMapPointOfInterestCategory.HIKING ＝ "HIKING"
HOSPITAL
AppleMapPointOfInterestCategory.HOSPITAL ＝ "HOSPITAL"
HOTEL
AppleMapPointOfInterestCategory.HOTEL ＝ "HOTEL"
KAYAKING
AppleMapPointOfInterestCategory.KAYAKING ＝ "KAYAKING"
LANDMARK
AppleMapPointOfInterestCategory.LANDMARK ＝ "LANDMARK"
LAUNDRY
AppleMapPointOfInterestCategory.LAUNDRY ＝ "LAUNDRY"
LIBRARY
AppleMapPointOfInterestCategory.LIBRARY ＝ "LIBRARY"
MAILBOX
AppleMapPointOfInterestCategory.MAILBOX ＝ "MAILBOX"
MARINA
AppleMapPointOfInterestCategory.MARINA ＝ "MARINA"
MINI_GOLF
AppleMapPointOfInterestCategory.MINI_GOLF ＝ "MINI_GOLF"
MOVIE_THEATER
AppleMapPointOfInterestCategory.MOVIE_THEATER ＝ "MOVIE_THEATER"
MUSEUM
AppleMapPointOfInterestCategory.MUSEUM ＝ "MUSEUM"
MUSIC_VENUE
AppleMapPointOfInterestCategory.MUSIC_VENUE ＝ "MUSIC_VENUE"
NATIONAL_MONUMENT
AppleMapPointOfInterestCategory.NATIONAL_MONUMENT ＝ "NATIONAL_MONUMENT"
NATIONAL_PARK
AppleMapPointOfInterestCategory.NATIONAL_PARK ＝ "NATIONAL_PARK"
NIGHTLIFE
AppleMapPointOfInterestCategory.NIGHTLIFE ＝ "NIGHTLIFE"
PARK
AppleMapPointOfInterestCategory.PARK ＝ "PARK"
PARKING
AppleMapPointOfInterestCategory.PARKING ＝ "PARKING"
PHARMACY
AppleMapPointOfInterestCategory.PHARMACY ＝ "PHARMACY"
PLANETARIUM
AppleMapPointOfInterestCategory.PLANETARIUM ＝ "PLANETARIUM"
POLICE
AppleMapPointOfInterestCategory.POLICE ＝ "POLICE"
POST_OFFICE
AppleMapPointOfInterestCategory.POST_OFFICE ＝ "POST_OFFICE"
PUBLIC_TRANSPORT
AppleMapPointOfInterestCategory.PUBLIC_TRANSPORT ＝ "PUBLIC_TRANSPORT"
RESTAURANT
AppleMapPointOfInterestCategory.RESTAURANT ＝ "RESTAURANT"
RESTROOM
AppleMapPointOfInterestCategory.RESTROOM ＝ "RESTROOM"
ROCK_CLIMBING
AppleMapPointOfInterestCategory.ROCK_CLIMBING ＝ "ROCK_CLIMBING"
RV_PARK
AppleMapPointOfInterestCategory.RV_PARK ＝ "RV_PARK"
SCHOOL
AppleMapPointOfInterestCategory.SCHOOL ＝ "SCHOOL"
SKATE_PARK
AppleMapPointOfInterestCategory.SKATE_PARK ＝ "SKATE_PARK"
SKATING
AppleMapPointOfInterestCategory.SKATING ＝ "SKATING"
SKIING
AppleMapPointOfInterestCategory.SKIING ＝ "SKIING"
SOCCER
AppleMapPointOfInterestCategory.SOCCER ＝ "SOCCER"
SPA
AppleMapPointOfInterestCategory.SPA ＝ "SPA"
STADIUM
AppleMapPointOfInterestCategory.STADIUM ＝ "STADIUM"
STORE
AppleMapPointOfInterestCategory.STORE ＝ "STORE"
SURFING
AppleMapPointOfInterestCategory.SURFING ＝ "SURFING"
SWIMMING
AppleMapPointOfInterestCategory.SWIMMING ＝ "SWIMMING"
TENNIS
AppleMapPointOfInterestCategory.TENNIS ＝ "TENNIS"
THEATER
AppleMapPointOfInterestCategory.THEATER ＝ "THEATER"
UNIVERSITY
AppleMapPointOfInterestCategory.UNIVERSITY ＝ "UNIVERSITY"
VOLLEYBALL
AppleMapPointOfInterestCategory.VOLLEYBALL ＝ "VOLLEYBALL"
WINERY
AppleMapPointOfInterestCategory.WINERY ＝ "WINERY"
ZOO
AppleMapPointOfInterestCategory.ZOO ＝ "ZOO"
AppleMapsColorScheme
Controls the color scheme (appearance) of the map.

AUTOMATIC
AppleMapsColorScheme.AUTOMATIC ＝ "AUTOMATIC"
The map follows the app's color scheme (light/dark mode).

DARK
AppleMapsColorScheme.DARK ＝ "DARK"
The map is always displayed in dark mode.

LIGHT
AppleMapsColorScheme.LIGHT ＝ "LIGHT"
The map is always displayed in light mode.

AppleMapsContourStyle
The style of the polyline.

GEODESIC
AppleMapsContourStyle.GEODESIC ＝ "GEODESIC"
A geodesic line.

STRAIGHT
AppleMapsContourStyle.STRAIGHT ＝ "STRAIGHT"
A straight line.

AppleMapsMapStyleElevation
AUTOMATIC
AppleMapsMapStyleElevation.AUTOMATIC ＝ "AUTOMATIC"
The default elevation style, that renders a flat, 2D map.

FLAT
AppleMapsMapStyleElevation.FLAT ＝ "FLAT"
A flat elevation style.

REALISTIC
AppleMapsMapStyleElevation.REALISTIC ＝ "REALISTIC"
A value that renders a realistic, 3D map.

AppleMapsMapStyleEmphasis
AUTOMATIC
AppleMapsMapStyleEmphasis.AUTOMATIC ＝ "AUTOMATIC"
The default level of emphasis.

MUTED
AppleMapsMapStyleEmphasis.MUTED ＝ "MUTED"
A muted emphasis style, that deemphasizes the map’s imagery.

AppleMapsMapType
The type of map to display.

HYBRID
AppleMapsMapType.HYBRID ＝ "HYBRID"
A satellite image of the area with road and road name layers on top.

IMAGERY
AppleMapsMapType.IMAGERY ＝ "IMAGERY"
A satellite image of the area.

STANDARD
AppleMapsMapType.STANDARD ＝ "STANDARD"
A street map that shows the position of all roads and some road names.

GoogleMapsColorScheme
DARK
GoogleMapsColorScheme.DARK ＝ "DARK"
FOLLOW_SYSTEM
GoogleMapsColorScheme.FOLLOW_SYSTEM ＝ "FOLLOW_SYSTEM"
LIGHT
GoogleMapsColorScheme.LIGHT ＝ "LIGHT"
GoogleMapsMapType
The type of map to display.

HYBRID
GoogleMapsMapType.HYBRID ＝ "HYBRID"
Satellite imagery with roads and points of interest overlayed.

NORMAL
GoogleMapsMapType.NORMAL ＝ "NORMAL"
Standard road map.

SATELLITE
GoogleMapsMapType.SATELLITE ＝ "SATELLITE"
Satellite imagery.

TERRAIN
GoogleMapsMapType.TERRAIN ＝ "TERRAIN"
Topographic data.

Permissions
Android
To show the user's location on the map, the expo-maps library requires the following permissions:

ACCESS_COARSE_LOCATION: for approximate device location
ACCESS_FINE_LOCATION: for precise device location
Android Permission Description
ACCESS_COARSE_LOCATION

Allows an app to access approximate location.

Alternatively, you might want ACCESS_FINE_LOCATION.
ACCESS_FINE_LOCATION

Allows an app to access precise location.

Alternatively, you might want ACCESS_COARSE_LOCATION.
FOREGROUND_SERVICE

Allows a regular application to use Service.startForeground.

Allows a regular application to use Service.startForeground.
FOREGROUND_SERVICE_LOCATION

Allows a regular application to use Service.startForeground with the type "location".

Allows a regular application to use Service.startForeground with the type "location".
ACCESS_BACKGROUND_LOCATION

Allows an app to access location in the background.

If you're requesting this permission, you must also request either ACCESS_COARSE_LOCATION or ACCESS_FINE_LOCATION. Requesting this permission by itself doesn't give you location access.
iOS
The following usage description keys are used by this library:

Info.plist Key Description
NSLocationWhenInUseUsageDescription

A message that tells the user why the app is requesting access to the user’s location information while the app is running in the foreground.
