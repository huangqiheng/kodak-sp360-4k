# kodak-sp360-4k


vim /etc/network/interface
```
source-directory /etc/network/interfaces.d

auto lo wlan0 wlan1 wlan2

iface lo inet loopback
iface eth0 inet dhcp 

allow-hotplug wlan0
iface wlan0 inet dhcp
wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf

##############################################

allow-hotplug wlan1
iface wlan1 inet manual
wpa-roam /etc/wpa_supplicant/wpa_supplicant1.conf

iface camera1 inet static
  up ip route add 172.16.0.0/24 dev wlan1 proto kernel scope link src 172.16.0.101 table 101
  up ip rule add from 172.16.0.101 lookup 101
  up ip route flush cache
  down ip route flush table 101
  down ip rule del from 172.16.0.101 lookup 101
  down ip route del 172.16.0.0/24 dev wlan1 table main

##############################################

allow-hotplug wlan2
iface wlan2 inet manual
wpa-roam /etc/wpa_supplicant/wpa_supplicant2.conf

iface camera2 inet static
  up ip route add 172.16.0.0/24 dev wlan2 proto kernel scope link src 172.16.0.102 table 102
  up ip rule add from 172.16.0.102 lookup 102
  up ip route flush cache
  down ip route flush table 102
  down ip rule del from 172.16.0.102 lookup 102
  down ip route del 172.16.0.0/24 dev wlan2 table main

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

