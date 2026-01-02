#!/bin/bash
working_dir=$(dirname "$(readlink -f "$0")")
cd "${working_dir}"
which htpasswd &> /dev/null || sudo apt install apache2-utils
read -rp "htpasswd username: " username
htpasswd ../.htpasswd "${username}"
