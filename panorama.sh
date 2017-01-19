#!/bin/bash

init_install () {
	apt install -y hugin-tools
	apt install -y enblend
	apt install -y libav-tools
}

cd cache

create_pto () {
	pto_gen -p 2 -f 235 -o kodak.pto 101_S0JA0010000056L0.jpg 102_S0JA0010000056L0.jpg
	cpfind --fullscale --celeste --multirow --ncores 3 -o working-kodak.pto kodak.pto
	cpclean -o kodak.pto kodak.pto
	linefind -o kodak.pto kodak.pto
	autooptimiser -a -p -s -o kodak.pto kodak.pto
	pano_modify -c -s --canvas=3840x2160 -o kodak.pto kodak.pto
	pano_modify --rotate=180,0,0 -o kodak.pto kodak.pto
}

run_nona () {
	nona -z 90 -r ldr -m JPEG -i 0 -o left_eye.tif kodak.pto 101_S0JA0010000056L0.jpg 102_S0JA0010000056L0.jpg
	nona -z 90 -r ldr -m JPEG -i 1 -o right_eye.tif kodak.pto 101_S0JA0010000056L0.jpg 102_S0JA0010000056L0.jpg
	cp left_eye.jpg /media/cdrom/
	cp right_eye.jpg /media/cdrom/
}

	nona -z 90 -r ldr -m JPEG -i 0 -o left_eye.jpg kodak.pto 101_S0JA0010000056L0.jpg 102_S0JA0010000056L0.jpg
	nona -z 90 -r ldr -m JPEG -i 1 -o right_eye.jpg kodak.pto 101_S0JA0010000056L0.jpg 102_S0JA0010000056L0.jpg

//enblend -o out.jpg left_eye.jpg right_eye.jpg

