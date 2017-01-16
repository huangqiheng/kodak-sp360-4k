# kodak-sp360-4k


vim /etc/network/interface
```
source-directory /etc/network/interfaces.d

auto lo wlan0 wlan1 wlan2

iface lo inet loopback
iface eth0 inet dhcp 

##############################################

allow-hotplug wlan0
iface wlan0 inet dhcp
wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf

allow-hotplug wlan1
iface wlan1 inet manual
wpa-roam /etc/wpa_supplicant/wpa_supplicant1.conf

allow-hotplug wlan2
iface wlan2 inet manual
wpa-roam /etc/wpa_supplicant/wpa_supplicant2.conf

##############################################

iface default inet dhcp

```


vim /etc/dhcpcd.conf
```
# Appand to end of file

interface wlan1
  static ip_address=172.16.0.101/24

interface wlan2
  static ip_address=172.16.0.102/24
```

