#!/bin/bash
parent_folder=$(dirname "${BASH_SOURCE[0]}")
source $parent_folder/ganache.sh

start_ganache
get_address ganache.out 0
rm ganache.out
FROM_ADDRESS=$address truffle test
if [ $CI ]; then
  codechecks
fi
exit_ganache