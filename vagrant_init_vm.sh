#!/bin/bash

# Make sure we are the "vagrant" user
if [[ "$USER" != "vagrant" ]]; then
   echo "This script must be run with the 'vagrant' user!."
   exit 1
fi


report_step()
{
    echo 
    echo "****************************"
    echo "*** $1"
    echo "****************************"
    echo 
}

report_sub_step()
{
    echo 
    echo "*** $1"
    echo 
}

update_debian_sources()
{
    report_step "Debian sources update..."
    sudo apt-get update
}

enable_ubuntu_ppa()
{
    report_step "Ubuntu PPA activation..."
    sudo apt-get install -y python-software-properties
}

install_misc_utils()
{
    report_step "Misc utils install (Git, Curl, make, etc.) ..."
    sudo apt-get install -y git curl wget build-essential vim udev
    # (yeah, we may need udev because of this VM bug :
    # http://www.ducea.com/2009/02/18/linux-tips-bash-completion-devfd62-no-such-file-or-directory/
    # )
}


install_webmin()
{
    report_step "Webmin install..."
    wget http://prdownloads.sourceforge.net/webadmin/webmin_1.650_all.deb
    sudo dpkg -i webmin_1.650_all.deb
    sudo apt-get install -y -f
    rm webmin_*
}


install_nodejs()
{
    report_step "Node.js install..."
    sudo add-apt-repository -y ppa:chris-lea/node.js
    sudo add-apt-repository -y ppa:chris-lea/node.js-devel
    sudo apt-get update
    sudo apt-get install -y nodejs nodejs-devel
}


install_mysql()
{
    report_step "MySQL install..."
    sudo apt-get install -y mysql-server mysql-client libmysqlclient-dev
}


install_sqlite()
{
    report_step "SQLite install..."
    sudo apt-get install -y sqlite3 libsqlite3-dev
}


install_postgresql()
{
    report_step "PostgreSQL install..."
    sudo apt-get install -y postgresql postgresql-client postgresql-server-dev-all
}


# Ok, let's roll!!

# ######### In Spain, first we update, THEN when install!
update_debian_sources


# ######### We may need some PPA...
enable_ubuntu_ppa


# ######### Misc utils
install_misc_utils


# ######### Webmin may be useful...
install_webmin


# ######### Let's use a recent Node.js version...
install_nodejs


# ######### Node-DBI is a DB abstraction layer.
# Let's install some DB engines !
install_mysql
install_sqlite
install_postgresql


# ######### Finished!
report_step "Finished!"



