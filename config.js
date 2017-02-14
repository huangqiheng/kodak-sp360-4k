'use strict';
//............... global defind ..............
//////////////////////////////////////////////
global.HOST_LOCALIP_A = '172.16.0.101';
global.HOST_LOCALIP_B = '172.16.0.102';
global.iface = {'172.16.0.101':'wlan1', '172.16.0.102':'wlan2'};
global.CAM_HOST = '172.16.0.254';
global.CAM_CMD_PORT = 9175;
global.CAM_WEB_PORT = 80;
global.CAM_WEB_TIMEOUT = 1500;
global.PTO_FILE = __dirname + '/kodak.pto';
global.CACHE_ROOT = __dirname + '/cache';
global.WEB_ROOT = __dirname + '/public';
global.WEB_PANO = WEB_ROOT + '/pano';
