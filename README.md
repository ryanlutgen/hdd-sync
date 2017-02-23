# HDD Sync

This repo houses NodeJS code developed to help with my redundancy file backups on my stream/server PC.

This script will iterate through a source path and copy directories/files to a destination directory.  This was developed with the source and dest directories being the roots of their respective drives.
- Certain paths can be ignored if they take up too much time, don't need redundancy, etc.

For any who are curious, my stream/server PC has a HDD that is exposed to my Windows Homegroup that functions as a drop in area for files to be backed up.  I use a program called [DropIt](http://www.dropitproject.com/) to periodically scan the drop in drive and move files out of the drop in drive into a seperate, larger drive.  The files are moved into various folders depending on file type (images, word/ppt/excel, mp3, etc).  A limitation of the DropIt program is that source directories and destination directories have a 1-1 relationship, so one cannot tell it to copy to two different paths for redundancy.  Rather than set up another option to scan the ENTIRE drive that data was initially moved to every X seconds, I decided to develop this script to periodically sync my drives whenever I wanted.