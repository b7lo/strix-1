Accelerometer from expo-sensors provides access to the device accelerometer sensor(s) and associated listeners to respond to changes in acceleration in three-dimensional space, meaning any movement or vibration.

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Usage
Basic Accelerometer usage

Copy

Open in Snack

import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';

export default function App() {
const [{ x, y, z }, setData] = useState({
x: 0,
y: 0,
z: 0,
});
const [subscription, setSubscription] = useState(null);

const \_slow = () => Accelerometer.setUpdateInterval(1000);
const \_fast = () => Accelerometer.setUpdateInterval(16);

const \_subscribe = () => {
setSubscription(Accelerometer.addListener(setData));
};

const \_unsubscribe = () => {
subscription && subscription.remove();
setSubscription(null);
};

useEffect(() => {
\_subscribe();
return () => \_unsubscribe();
}, []);

return (
<View style={styles.container}>
<Text style={styles.text}>Accelerometer: (in gs where 1g = 9.81 m/s^2)</Text>
<Text style={styles.text}>x: {x}</Text>
<Text style={styles.text}>y: {y}</Text>
<Text style={styles.text}>z: {z}</Text>
<View style={styles.buttonContainer}>
<TouchableOpacity onPress={subscription ? \_unsubscribe : \_subscribe} style={styles.button}>
<Text>{subscription ? 'On' : 'Off'}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={\_slow} style={[styles.button, styles.middleButton]}>
<Text>Slow</Text>
</TouchableOpacity>
<TouchableOpacity onPress={_fast} style={styles.button}>
<Text>Fast</Text>
</TouchableOpacity>
</View>
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
justifyContent: 'center',
paddingHorizontal: 20,
},
text: {
textAlign: 'center',
},
buttonContainer: {
flexDirection: 'row',
alignItems: 'stretch',
marginTop: 15,
},
button: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#eee',
padding: 10,
},
middleButton: {
borderLeftWidth: 1,
borderRightWidth: 1,
borderColor: '#ccc',
},
});

Show More
API
import { Accelerometer } from 'expo-sensors';
Classes
Accelerometer
Type: Class extends DeviceSensor<AccelerometerMeasurement>

A base class for subscribable sensors. The events emitted by this class are measurements specified by the parameter type Measurement.

Accelerometer Methods

addListener(listener)
Parameter Type Description
listener Listener<AccelerometerMeasurement>
A callback that is invoked when an accelerometer update is available. When invoked, the listener is provided a single argument that is an AccelerometerMeasurement object.

Subscribe for updates to the accelerometer.

Returns:
EventSubscription
A subscription that you can call remove() on when you would like to unsubscribe the listener.

getListenerCount()
Returns the registered listeners count.

Returns:
number
getPermissionsAsync()
Checks user's permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
hasListeners()
Returns boolean which signifies if sensor has any listeners registered.

Returns:
boolean
isAvailableAsync()
You should always check the sensor availability before attempting to use it.
Returns whether the accelerometer is enabled on the device.

On mobile web, you must first invoke Accelerometer.requestPermissionsAsync() in a user interaction (i.e. touch event) before you can use this module. If the status is not equal to granted then you should inform the end user that they may have to open settings.

On web this starts a timer and waits to see if an event is fired. This should predict if the iOS device has the device orientation API disabled in Settings > Safari > Motion & Orientation Access. Some devices will also not fire if the site isn't hosted with HTTPS as DeviceMotion is now considered a secure API. There is no formal API for detecting the status of DeviceMotion so this API can sometimes be unreliable on web.

Returns:
Promise<boolean>
A promise that resolves to a boolean denoting the availability of the accelerometer.

removeAllListeners()
Removes all registered listeners.

Returns:
void
Deprecated: use subscription.remove() instead.

removeSubscription(subscription)
Parameter Type
subscription EventSubscription

Returns:
void
requestPermissionsAsync()
Asks the user to grant permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
setUpdateInterval(intervalMs)
Parameter Type Description
intervalMs number
Desired interval in milliseconds between sensor updates.

Starting from Android 12 (API level 31), the system has a 200Hz limit for each sensor updates.

If you need an update interval of greater than 200Hz, you should

add android.permission.HIGH_SAMPLING_RATE_SENSORS to app.json permissions field
or if you are using an existing React Native project, add <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS"/> to AndroidManifest.xml.

Set the sensor update interval.

Returns:
void
Interfaces
Subscription
A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

remove()
Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns:
void
Types
AccelerometerMeasurement
Each of these keys represents the acceleration along that particular axis in g-force (measured in gs).

A g is a unit of gravitational force equal to that exerted by the earth’s gravitational field (9.81 m/s^2).

Property Type Description
timestamp number
Timestamp of the measurement in seconds.

x number
Value of gs device reported in X axis.

y number
Value of gs device reported in Y axis.

z number
Value of gs device reported in Z axis.

PermissionExpiration
Literal Type: union

Permission expiration time. Currently, all permissions are granted permanently.

Acceptable values are: 'never' | number

PermissionResponse
An object obtained by permissions get and request functions.

Property Type Description
canAskAgain boolean
Indicates if user can be asked again for specific permission. If not, one should be directed to the Settings app in order to enable/disable the permission.

expires PermissionExpiration
Determines time when the permission expires.

granted boolean
A convenience boolean that indicates if the permission is granted.

status PermissionStatus
Determines the status of the permission.

Enums
PermissionStatus
DENIED
PermissionStatus.DENIED ＝ "denied"
User has denied the permission.

GRANTED
PermissionStatus.GRANTED ＝ "granted"
User has granted the permission.

UNDETERMINED
PermissionStatus.UNDETERMINED ＝ "undetermined"
User hasn't granted or denied the permission yet.

---

expo-sensors provide various APIs for accessing device sensors to measure motion, orientation, pressure, magnetic fields, ambient light, and step count.

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Configuration in app config
You can configure expo-sensors using its built-in config plugin if you use config plugins in your project (Continuous Native Generation (CNG)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does not use CNG, then you'll need to manually configure the library.

Example app.json with config plugin
app.json

Copy

{
"expo": {
"plugins": [
[
"expo-sensors",
{
"motionPermission": "Allow $(PRODUCT_NAME) to access your device motion"
}
]
]
}
}
Configurable properties
Name Default Description
motionPermission "Allow $(PRODUCT_NAME) to access your device motion"
Only for: 

A string to set the NSMotionUsageDescription permission message or false to disable motion permissions.

API
import \* as Sensors from 'expo-sensors';
// OR
import {
Accelerometer,
Barometer,
DeviceMotion,
Gyroscope,
LightSensor,
Magnetometer,
MagnetometerUncalibrated,
Pedometer,
} from 'expo-sensors';
Permissions
Android
Starting in Android 12 (API level 31), the system has a 200Hz limit for each sensor updates.

If you need an update interval greater than 200Hz, you must add the following permissions to your app.json inside the expo.android.permissions array.

Android Permission Description
HIGH_SAMPLING_RATE_SENSORS

Allows an app to access sensor data with a sampling rate greater than 200 Hz.

Are you using this library in an existing React Native app?

iOS
The following usage description keys are used by this library:

Info.plist Key Description
NSMotionUsageDescription

## A message that tells the user why the app is requesting access to the device’s motion data.

DeviceMotion from expo-sensors provides access to the device motion and orientation sensors. All data is presented in terms of three axes that run through a device. According to portrait orientation: X runs from left to right, Y from bottom to top and Z perpendicularly through the screen from back to front.

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Configuration in app config
You can configure DeviceMotion from expo-sensor using its built-in config plugin if you use config plugins in your project (Continuous Native Generation (CNG)). The plugin allows you to configure various properties that cannot be set at runtime and require building a new app binary to take effect. If your app does not use CNG, then you'll need to manually configure the library.

Example app.json with config plugin
app.json

Copy

{
"expo": {
"plugins": [
[
"expo-sensors",
{
"motionPermission": "Allow $(PRODUCT_NAME) to access your device motion."
}
]
]
}
}
Configurable properties
Name Default Description
motionPermission "Allow $(PRODUCT_NAME) to access your device motion"
Only for: 

A string to set the NSMotionUsageDescription permission message.

Are you using this library in an existing React Native app?

API
import { DeviceMotion } from 'expo-sensors';
Constants
Gravity
Type: number

Constant value representing standard gravitational acceleration for Earth (9.80665 m/s^2).

Classes
DeviceMotion
Type: Class extends DeviceSensor<DeviceMotionMeasurement>

A base class for subscribable sensors. The events emitted by this class are measurements specified by the parameter type Measurement.

DeviceMotion Properties

Gravity
Type: number • Default: ExponentDeviceMotion.Gravity
Constant value representing standard gravitational acceleration for Earth (9.80665 m/s^2).

DeviceMotion Methods

addListener(listener)
Parameter Type Description
listener Listener<DeviceMotionMeasurement>
A callback that is invoked when a device motion sensor update is available. When invoked, the listener is provided a single argument that is a DeviceMotionMeasurement object.

Subscribe for updates to the device motion sensor.

Returns:
EventSubscription
A subscription that you can call remove() on when you would like to unsubscribe the listener.

getListenerCount()
Returns the registered listeners count.

Returns:
number
getPermissionsAsync()
Checks user's permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
hasListeners()
Returns boolean which signifies if sensor has any listeners registered.

Returns:
boolean
isAvailableAsync()
You should always check the sensor availability before attempting to use it.
Returns whether the accelerometer is enabled on the device.

On mobile web, you must first invoke DeviceMotion.requestPermissionsAsync() in a user interaction (i.e. touch event) before you can use this module. If the status is not equal to granted then you should inform the end user that they may have to open settings.

On web this starts a timer and waits to see if an event is fired. This should predict if the iOS device has the device orientation API disabled in Settings > Safari > Motion & Orientation Access. Some devices will also not fire if the site isn't hosted with HTTPS as DeviceMotion is now considered a secure API. There is no formal API for detecting the status of DeviceMotion so this API can sometimes be unreliable on web.

Returns:
Promise<boolean>
A promise that resolves to a boolean denoting the availability of device motion sensor.

removeAllListeners()
Removes all registered listeners.

Returns:
void
Deprecated: use subscription.remove() instead.

removeSubscription(subscription)
Parameter Type
subscription EventSubscription

Returns:
void
requestPermissionsAsync()
Asks the user to grant permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
setUpdateInterval(intervalMs)
Parameter Type Description
intervalMs number
Desired interval in milliseconds between sensor updates.

Starting from Android 12 (API level 31), the system has a 200Hz limit for each sensor updates.

If you need an update interval of greater than 200Hz, you should

add android.permission.HIGH_SAMPLING_RATE_SENSORS to app.json permissions field
or if you are using an existing React Native project, add <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS"/> to AndroidManifest.xml.

Set the sensor update interval.

Returns:
void
Interfaces
Subscription
A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

remove()
Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns:
void
Types
DeviceMotionMeasurement
Property Type Description
acceleration
null | {
timestamp: number,
x: number,
y: number,
z: number
}
Device acceleration on the three axis as an object with x, y, z keys. Expressed in meters per second squared (m/s^2).

accelerationIncludingGravity
{
timestamp: number,
x: number,
y: number,
z: number
}
Device acceleration with the effect of gravity on the three axis as an object with x, y, z keys. Expressed in meters per second squared (m/s^2).

interval number
Interval at which data is obtained from the native platform. Expressed in milliseconds (ms).

orientation DeviceMotionOrientation
Device orientation based on screen rotation. Value is one of:

0 (portrait),
90 (right landscape),
180 (upside down),
-90 (left landscape).
rotation
{
alpha: number,
beta: number,
gamma: number,
timestamp: number
}
Device's orientation in space as an object with alpha, beta, gamma keys where alpha is for rotation around Z axis, beta for X axis rotation and gamma for Y axis rotation.

rotationRate
null | {
alpha: number,
beta: number,
gamma: number,
timestamp: number
}
Device's rate of rotation in space expressed in degrees per second (deg/s).

PermissionExpiration
Literal Type: union

Permission expiration time. Currently, all permissions are granted permanently.

Acceptable values are: 'never' | number

PermissionResponse
An object obtained by permissions get and request functions.

Property Type Description
canAskAgain boolean
Indicates if user can be asked again for specific permission. If not, one should be directed to the Settings app in order to enable/disable the permission.

expires PermissionExpiration
Determines time when the permission expires.

granted boolean
A convenience boolean that indicates if the permission is granted.

status PermissionStatus
Determines the status of the permission.

Enums
DeviceMotionOrientation
LeftLandscape
DeviceMotionOrientation.LeftLandscape ＝ -90
Portrait
DeviceMotionOrientation.Portrait ＝ 0
RightLandscape
DeviceMotionOrientation.RightLandscape ＝ 90
UpsideDown
DeviceMotionOrientation.UpsideDown ＝ 180
PermissionStatus
DENIED
PermissionStatus.DENIED ＝ "denied"
User has denied the permission.

GRANTED
PermissionStatus.GRANTED ＝ "granted"
User has granted the permission.

UNDETERMINED
PermissionStatus.UNDETERMINED ＝ "undetermined"
User hasn't granted or denied the permission yet.

Permissions
iOS
The following usage description keys are used by this library:

Info.plist Key Description
NSMotionUsageDescription

## A message that tells the user why the app is requesting access to the device’s motion data.

Gyroscope from expo-sensors provides access to the device's gyroscope sensor to respond to changes in rotation in three-dimensional space.

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Usage
Basic Gyroscope usage

Copy

Open in Snack

import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gyroscope } from 'expo-sensors';

export default function App() {
const [{ x, y, z }, setData] = useState({
x: 0,
y: 0,
z: 0,
});
const [subscription, setSubscription] = useState(null);

const \_slow = () => Gyroscope.setUpdateInterval(1000);
const \_fast = () => Gyroscope.setUpdateInterval(16);

const \_subscribe = () => {
setSubscription(
Gyroscope.addListener(gyroscopeData => {
setData(gyroscopeData);
})
);
};

const \_unsubscribe = () => {
subscription && subscription.remove();
setSubscription(null);
};

useEffect(() => {
\_subscribe();
return () => \_unsubscribe();
}, []);

return (
<View style={styles.container}>
<Text style={styles.text}>Gyroscope:</Text>
<Text style={styles.text}>x: {x}</Text>
<Text style={styles.text}>y: {y}</Text>
<Text style={styles.text}>z: {z}</Text>
<View style={styles.buttonContainer}>
<TouchableOpacity onPress={subscription ? \_unsubscribe : \_subscribe} style={styles.button}>
<Text>{subscription ? 'On' : 'Off'}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={\_slow} style={[styles.button, styles.middleButton]}>
<Text>Slow</Text>
</TouchableOpacity>
<TouchableOpacity onPress={_fast} style={styles.button}>
<Text>Fast</Text>
</TouchableOpacity>
</View>
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
justifyContent: 'center',
paddingHorizontal: 10,
},
text: {
textAlign: 'center',
},
buttonContainer: {
flexDirection: 'row',
alignItems: 'stretch',
marginTop: 15,
},
button: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#eee',
padding: 10,
},
middleButton: {
borderLeftWidth: 1,
borderRightWidth: 1,
borderColor: '#ccc',
},
});

Show More
API
import { Gyroscope } from 'expo-sensors';
Classes
Gyroscope
Type: Class extends DeviceSensor<GyroscopeMeasurement>

A base class for subscribable sensors. The events emitted by this class are measurements specified by the parameter type Measurement.

Gyroscope Methods

addListener(listener)
Parameter Type Description
listener Listener<GyroscopeMeasurement>
A callback that is invoked when a gyroscope update is available. When invoked, the listener is provided a single argument that is an GyroscopeMeasurement object.

Subscribe for updates to the gyroscope.

Returns:
EventSubscription
A subscription that you can call remove() on when you would like to unsubscribe the listener.

getListenerCount()
Returns the registered listeners count.

Returns:
number
getPermissionsAsync()
Checks user's permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
hasListeners()
Returns boolean which signifies if sensor has any listeners registered.

Returns:
boolean
isAvailableAsync()
You should always check the sensor availability before attempting to use it.
Returns whether the gyroscope is enabled on the device.

On mobile web, you must first invoke Gyroscope.requestPermissionsAsync() in a user interaction (i.e. touch event) before you can use this module. If the status is not equal to granted then you should inform the end user that they may have to open settings.

On web this starts a timer and waits to see if an event is fired. This should predict if the iOS device has the device orientation API disabled in Settings > Safari > Motion & Orientation Access. Some devices will also not fire if the site isn't hosted with HTTPS as DeviceMotion is now considered a secure API. There is no formal API for detecting the status of DeviceMotion so this API can sometimes be unreliable on web.

Returns:
Promise<boolean>
A promise that resolves to a boolean denoting the availability of the gyroscope.

removeAllListeners()
Removes all registered listeners.

Returns:
void
Deprecated: use subscription.remove() instead.

removeSubscription(subscription)
Parameter Type
subscription EventSubscription

Returns:
void
requestPermissionsAsync()
Asks the user to grant permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
setUpdateInterval(intervalMs)
Parameter Type Description
intervalMs number
Desired interval in milliseconds between sensor updates.

Starting from Android 12 (API level 31), the system has a 200Hz limit for each sensor updates.

If you need an update interval of greater than 200Hz, you should

add android.permission.HIGH_SAMPLING_RATE_SENSORS to app.json permissions field
or if you are using an existing React Native project, add <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS"/> to AndroidManifest.xml.

Set the sensor update interval.

Returns:
void
Interfaces
Subscription
A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

remove()
Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns:
void
Types
GyroscopeMeasurement
Each of these keys represents the rotation along that particular axis measured in radians per second (rad/s).

Property Type Description
timestamp number
Timestamp of the measurement in seconds.

x number
Value of rotation in radians per second device reported in X axis.

y number
Value of rotation in radians per second device reported in Y axis.

z number
Value of rotation in radians per second device reported in Z axis.

PermissionExpiration
Literal Type: union

Permission expiration time. Currently, all permissions are granted permanently.

Acceptable values are: 'never' | number

PermissionResponse
An object obtained by permissions get and request functions.

Property Type Description
canAskAgain boolean
Indicates if user can be asked again for specific permission. If not, one should be directed to the Settings app in order to enable/disable the permission.

expires PermissionExpiration
Determines time when the permission expires.

granted boolean
A convenience boolean that indicates if the permission is granted.

status PermissionStatus
Determines the status of the permission.

Enums
PermissionStatus
DENIED
PermissionStatus.DENIED ＝ "denied"
User has denied the permission.

GRANTED
PermissionStatus.GRANTED ＝ "granted"
User has granted the permission.

UNDETERMINED
PermissionStatus.UNDETERMINED ＝ "undetermined"
User hasn't granted or denied the permission yet.

---

Pedometer from expo-sensors uses the system hardware.Sensor on Android and Core Motion on iOS to get the user's step count, and also allows you to subscribe to pedometer updates.

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Usage
Pedometer

Copy

Open in Snack

import { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pedometer } from 'expo-sensors';

export default function App() {
const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
const [pastStepCount, setPastStepCount] = useState(0);
const [currentStepCount, setCurrentStepCount] = useState(0);

const subscribe = async () => {
const isAvailable = await Pedometer.isAvailableAsync();
setIsPedometerAvailable(String(isAvailable));

    if (isAvailable) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 1);

      const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
      if (pastStepCountResult) {
        setPastStepCount(pastStepCountResult.steps);
      }

      return Pedometer.watchStepCount(result => {
        setCurrentStepCount(result.steps);
      });
    }

};

useEffect(() => {
const subscription = subscribe();
return () => subscription && subscription.remove();
}, []);

return (
<View style={styles.container}>
<Text>Pedometer.isAvailableAsync(): {isPedometerAvailable}</Text>
<Text>Steps taken in the last 24 hours: {pastStepCount}</Text>
<Text>Walk! And watch this go up: {currentStepCount}</Text>
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
marginTop: 15,
alignItems: 'center',
justifyContent: 'center',
},
});

Show More
API
import { Pedometer } from 'expo-sensors';
Methods
Pedometer.getPermissionsAsync()
Checks user's permissions for accessing pedometer.

Returns:
Promise<PermissionResponse>
Pedometer.getStepCountAsync(start, end)
Parameter Type Description
start Date
A date indicating the start of the range over which to measure steps.

end Date
A date indicating the end of the range over which to measure steps.

Get the step count between two dates.

Returns:
Promise<PedometerResult>
Returns a promise that fulfills with a PedometerResult.

As Apple documentation states:

Only the past seven days worth of data is stored and available for you to retrieve. Specifying a start date that is more than seven days in the past returns only the available data.

Pedometer.isAvailableAsync()
Returns whether the pedometer is enabled on the device.

Returns:
Promise<boolean>
Returns a promise that fulfills with a boolean, indicating whether the pedometer is available on this device.

Pedometer.requestPermissionsAsync()
Asks the user to grant permissions for accessing pedometer.

Returns:
Promise<PermissionResponse>
Pedometer.watchStepCount(callback)
Parameter Type Description
callback PedometerUpdateCallback
A callback that is invoked when new step count data is available. The callback is provided with a single argument that is PedometerResult.

Subscribe to pedometer updates.

Returns:
EventSubscription
Returns a Subscription that enables you to call remove() when you would like to unsubscribe the listener.

Pedometer updates will not be delivered while the app is in the background. As an alternative, on Android, use another solution based on Health Connect API. On iOS, the getStepCountAsync method can be used to get the step count between two dates.

Interfaces
Subscription
A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

remove()
Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns:
void
Types
PedometerResult
Property Type Description
steps number
Number of steps taken between the given dates.

PedometerUpdateCallback(result)
Callback function providing event result as an argument.

Parameter Type
result PedometerResult
Returns:
void

PermissionExpiration
Literal Type: union

Permission expiration time. Currently, all permissions are granted permanently.

Acceptable values are: 'never' | number

PermissionResponse
An object obtained by permissions get and request functions.

Property Type Description
canAskAgain boolean
Indicates if user can be asked again for specific permission. If not, one should be directed to the Settings app in order to enable/disable the permission.

expires PermissionExpiration
Determines time when the permission expires.

granted boolean
A convenience boolean that indicates if the permission is granted.

status PermissionStatus
Determines the status of the permission.

Enums
PermissionStatus
DENIED
PermissionStatus.DENIED ＝ "denied"
User has denied the permission.

GRANTED
PermissionStatus.GRANTED ＝ "granted"
User has granted the permission.

UNDETERMINED
PermissionStatus.UNDETERMINED ＝ "undetermined"
User hasn't granted or denied the permission yet.

---

Barometer from expo-sensors provides access to the device barometer sensor to respond to changes in air pressure, which is measured in hectopascals (hPa).

Installation
Terminal

Copy

npx expo install expo-sensors
If you are installing this in an existing React Native app, make sure to install expo in your project.

Usage
Basic Barometer usage

Copy

Open in Snack

import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Barometer } from 'expo-sensors';

export default function App() {
const [{ pressure, relativeAltitude }, setData] = useState({ pressure: 0, relativeAltitude: 0 });
const [subscription, setSubscription] = useState(null);

const toggleListener = () => {
subscription ? unsubscribe() : subscribe();
};

const subscribe = () => {
setSubscription(Barometer.addListener(setData));
};

const unsubscribe = () => {
subscription && subscription.remove();
setSubscription(null);
};

return (
<View style={styles.wrapper}>
<Text>Barometer: Listener {subscription ? 'ACTIVE' : 'INACTIVE'}</Text>
<Text>Pressure: {pressure} hPa</Text>
<Text>
Relative Altitude:{' '}
{Platform.OS === 'ios' ? `${relativeAltitude} m` : `Only available on iOS`}
</Text>
<TouchableOpacity onPress={toggleListener} style={styles.button}>
<Text>Toggle listener</Text>
</TouchableOpacity>
</View>
);
}

const styles = StyleSheet.create({
button: {
justifyContent: 'center',
alignItems: 'center',
backgroundColor: '#eee',
padding: 10,
marginTop: 15,
},
wrapper: {
flex: 1,
alignItems: 'stretch',
justifyContent: 'center',
paddingHorizontal: 20,
},
});

Show More
API
import { Barometer } from 'expo-sensors';
Classes
Barometer
Type: Class extends DeviceSensor<BarometerMeasurement>

Barometer Methods

addListener(listener)
Parameter Type Description
listener Listener<BarometerMeasurement>
A callback that is invoked when a barometer update is available. When invoked, the listener is provided with a single argument that is BarometerMeasurement.

Subscribe for updates to the barometer.

Returns:
EventSubscription
A subscription that you can call remove() on when you would like to unsubscribe the listener.

Example

const subscription = Barometer.addListener(({ pressure, relativeAltitude }) => {
console.log({ pressure, relativeAltitude });
});
getListenerCount()
Returns the registered listeners count.

Returns:
number
getPermissionsAsync()
Checks user's permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
hasListeners()
Returns boolean which signifies if sensor has any listeners registered.

Returns:
boolean
isAvailableAsync()
You should always check the sensor availability before attempting to use it.
Check the availability of the device barometer. Requires at least Android 2.3 (API Level 9) and iOS 8.

Returns:
Promise<boolean>
A promise that resolves to a boolean denoting the availability of the sensor.

removeAllListeners()
Removes all registered listeners.

Returns:
void
Deprecated: use subscription.remove() instead.

removeSubscription(subscription)
Parameter Type
subscription EventSubscription

Returns:
void
requestPermissionsAsync()
Asks the user to grant permissions for accessing sensor.

Returns:
Promise<PermissionResponse>
setUpdateInterval(intervalMs)
Parameter Type Description
intervalMs number
Desired interval in milliseconds between sensor updates.

Starting from Android 12 (API level 31), the system has a 200Hz limit for each sensor updates.

If you need an update interval of greater than 200Hz, you should

add android.permission.HIGH_SAMPLING_RATE_SENSORS to app.json permissions field
or if you are using an existing React Native project, add <uses-permission android:name="android.permission.HIGH_SAMPLING_RATE_SENSORS"/> to AndroidManifest.xml.

Set the sensor update interval.

Returns:
void
Interfaces
Subscription
A subscription object that allows to conveniently remove an event listener from the emitter.

Subscription Methods

remove()
Removes an event listener for which the subscription has been created. After calling this function, the listener will no longer receive any events from the emitter.

Returns:
void
Types
BarometerMeasurement
The altitude data returned from the native sensors.

Property Type Description
pressure number
Measurement in hectopascals (hPa).

relativeAltitude
(optional)
number
Only for: 

Measurement in meters (m).

timestamp number
Timestamp of the measurement in seconds.

PermissionExpiration
Literal Type: union

Permission expiration time. Currently, all permissions are granted permanently.

Acceptable values are: 'never' | number

PermissionResponse
An object obtained by permissions get and request functions.

Property Type Description
canAskAgain boolean
Indicates if user can be asked again for specific permission. If not, one should be directed to the Settings app in order to enable/disable the permission.

expires PermissionExpiration
Determines time when the permission expires.

granted boolean
A convenience boolean that indicates if the permission is granted.

status PermissionStatus
Determines the status of the permission.

Enums
PermissionStatus
DENIED
PermissionStatus.DENIED ＝ "denied"
User has denied the permission.

GRANTED
PermissionStatus.GRANTED ＝ "granted"
User has granted the permission.

UNDETERMINED
PermissionStatus.UNDETERMINED ＝ "undetermined"
User hasn't granted or denied the permission yet.

Units and providers
OS Units Provider Description
iOS hPa CMAltimeter Altitude events reflect the change in the current altitude, not the absolute altitude.
Android hPa Sensor.TYPE_PRESSURE Monitoring air pressure changes.
Web This sensor is not available on the web and cannot be accessed. An UnavailabilityError will be thrown if you attempt to get data.
