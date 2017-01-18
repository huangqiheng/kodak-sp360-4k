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

