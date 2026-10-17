#!/usr/bin/env python3
"""Seed only a dedicated TapMiles App Store simulator with fictional demo data.

Usage: python3 scripts/prepare-app-store-demo.py DEVICE_UDID [--recording]
Never use this script with a user's normal simulator or physical device.
"""
import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess
import time
from zoneinfo import ZoneInfo

BUNDLE = 'app.rork.tapmiles-mileage-tracker'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device')
parser.add_argument('--recording', action='store_true')
args = parser.parse_args()

def simctl(*parts, check=True):
    return subprocess.run(['xcrun', 'simctl', *parts], check=check, capture_output=True, text=True).stdout.strip()

inventory = json.loads(simctl('list', 'devices', '--json'))
device = next((device for devices in inventory['devices'].values() for device in devices if device['udid'] == args.device), None)
if not device or not device['name'].startswith('TapMiles App Store '):
    raise SystemExit('Refusing to modify storage: use a dedicated simulator named TapMiles App Store …')
simctl('terminate', args.device, BUNDLE, check=False)
container = Path(simctl('get_app_container', args.device, BUNDLE, 'data'))
folder = container / 'Library' / 'Application Support' / BUNDLE / 'RCTAsyncLocalStorage_V1'
folder.mkdir(parents=True, exist_ok=True)
now = dt.datetime.now(ZoneInfo('America/Chicago'))
today = now.replace(hour=9, minute=10, second=0, microsecond=0)
rows = [
    (18.6, 28, 'business', 'clients', 'default_car_1', 'Client visit and project check-in.'),
    (7.2, 19, 'personal', None, 'weekend', 'Weekend errands.'),
    (12.4, 24, 'business', 'studio', 'default_car_1', 'Travel to the design studio.'),
    (24.8, 38, 'business', 'clients', 'default_car_1', 'On-site project meeting.'),
    (8.9, 22, 'medical', None, 'default_car_1', 'Routine appointment.'),
    (3.6, 12, 'charity', 'community', 'weekend', 'Community food drive.'),
    (42.1, 55, 'business', 'clients', 'default_car_1', 'Client planning session.'),
    (15.7, 31, 'personal', None, 'weekend', 'A drive across town.'),
]
trips = []
for i, (distance, minutes, purpose, project, vehicle, notes) in enumerate(rows):
    start = int((today-dt.timedelta(days=i)).timestamp()*1000)
    end = start + minutes*60000
    points = [{ 'latitude':37.77+j*0.001, 'longitude':-122.42+j*0.0015,
                'timestamp':start+int((end-start)*j/47), 'speed':12.1, 'accuracy':5 } for j in range(48)]
    trips.append(dict(id=f'app-store-demo-{i+1}', startTime=start, endTime=end, distance=distance,
                      duration=minutes*60, purpose=purpose, projectId=project, vehicleId=vehicle,
                      notes=notes, routePoints=points))
values = {
    'tapmiles_trips':json.dumps(trips, separators=(',', ':')),
    'tapmiles_projects':json.dumps([{'id':'clients','name':'Client visits'},{'id':'studio','name':'Studio work'},{'id':'community','name':'Community work'}]),
    'tapmiles_vehicles':json.dumps([{'id':'default_car_1','name':'Daily Driver'},{'id':'weekend','name':'Weekend Car'}]),
    'tapmiles_settings':json.dumps(dict(rounding='0.1', lockTripsAfter24h=False, allowEdits=True, autoDetectDriving=False, distanceUnit='miles')),
    'tapmiles_selected_vehicle':json.dumps('default_car_1'),
    'tapmiles_locale':'en',
}
if args.recording:
    stamp = int(time.time()*1000)
    start = stamp - 1338000
    points = [{'latitude':37.3349-j*0.0001,'longitude':-122.0090,'timestamp':start+int((stamp-start)*j/119),'speed':14.3,'accuracy':5} for j in range(120)]
    points[-1].update(latitude=37.3349, longitude=-122.0090, timestamp=stamp-1000)
    values['@tapmiles_tracking_state'] = json.dumps(dict(isTracking=True, startTime=start, distance=12.4, routePoints=points, lastPoint=points[-1], pendingTrip=None))
manifest = {}
for key, value in values.items():
    if len(value) <= 1024:
        manifest[key] = value
    else:
        (folder / hashlib.md5(key.encode()).hexdigest()).write_text(value)
        manifest[key] = None
(folder / 'manifest.json').write_text(json.dumps(manifest))
simctl('status_bar', args.device, 'override', '--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--cellularMode','active','--cellularBars','4','--batteryState','discharging','--batteryLevel','100')
simctl('ui', args.device, 'appearance', 'dark')
print(f"Prepared {device['name']}: {len(trips)} fictional trips; total {sum(row[0] for row in rows):.1f} miles.")
