#!/bin/sh

copy(){
    local network=$1
    # echo $network
    cp AcceptedToken/deployments/$network/*.json deployments/$network/
}