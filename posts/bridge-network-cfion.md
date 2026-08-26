---
title: Bridge-network-cfion
date: 2026-08-27
tags: ["vmware"]
---
```
###Bridge-network-cfion
####配置静态网卡
查看windows的网关
```

linux #ifconfig
Windows #ipconfig /all

```

```

C:\Users\12696>ipconfig /all #查看网关等信息
自动配置已启用. . . . . . . . . . : 是
本地链接 IPv6 地址. . . . . . . . : fe80::e50f:772:c0d6:8752%14(首选)
IPv4 地址 . . . . . . . . . . . . : 192.168.1.102(首选)
子网掩码  . . . . . . . . . . . . : 255.255.255.0
获得租约的时间  . . . . . . . . . : 2017年11月3日 11:38:48
租约过期的时间  . . . . . . . . . : 2017年11月3日 20:38:50
默认网关. . . . . . . . . . . . . : 192.168.1.1
DHCP 服务器 . . . . . . . . . . . : 192.168.1.1
DHCPv6 IAID . . . . . . . . . . . : 234888804
DHCPv6 客户端 DUID  . . . . . . . : 00-01-00-01-20-8E-22-99-F8-CA-B8-60-55-C1
DNS 服务器  . . . . . . . . . . . : 202.98.0.68
202.98.5.68
TCPIP 上的 NetBIOS  . . . . . . . : 已启用
隧道适配器 本地连接* 12:
媒体状态  . . . . . . . . . . . . : 媒体已断开连接
连接特定的 DNS 后缀 . . . . . . . :
描述. . . . . . . . . . . . . . . : Microsoft Teredo Tunneling Adapter
物理地址. . . . . . . . . . . . . : 00-00-00-00-00-00-00-E0
DHCP 已启用 . . . . . . . . . . . : 否
自动配置已启用. . . . . . . . . . : 是
C:\Users\12696>

```
###设置vmware为桥接模式
```

[root@16071224 network-scripts]# pwd
/etc/sysconfig/network-scripts
[root@16071224 network-scripts]# ls
ifcfg-eth0   ifdown-ippp    ifdown-tunnel  ifup-ipv6    ifup-sit
ifcfg-eth0~  ifdown-ipv6    ifup           ifup-isdn    ifup-tunnel
ifcfg-lo     ifdown-isdn    ifup-aliases   ifup-plip    ifup-wireless
ifdown       ifdown-post    ifup-bnep      ifup-plusb   init.ipv6-global
ifdown-bnep  ifdown-ppp     ifup-eth       ifup-post    net.hotplug
ifdown-eth   ifdown-routes  ifup-ib        ifup-ppp     network-functions
ifdown-ib    ifdown-sit     ifup-ippp      ifup-routes  network-functions-ipv6
[root@16071224 network-scripts]#
[root@16071224 network-scripts]#cp ifcfg-eth0 /home/worknetbak #备份

```
###查看虚拟机网卡信息
```

[root@16071224 桌面]# ifconfig
eth1      Link encap:Ethernet  HWaddr 00:50:56:35:F5:79
inet addr:192.168.231.131  Bcast:192.168.231.255  Mask:255.255.255.0
inet6 addr: fe80::250:56ff:fe35:f579/64 Scope:Link
UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
RX packets:3508 errors:0 dropped:0 overruns:0 frame:0
TX packets:5307 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:1000
RX bytes:398034 (388.7 KiB)  TX bytes:4828465 (4.6 MiB)
Interrupt:19 Base address:0x2024
lo        Link encap:Local Loopback
inet addr:127.0.0.1  Mask:255.0.0.0
inet6 addr: ::1/128 Scope:Host
UP LOOPBACK RUNNING  MTU:65536  Metric:1
RX packets:521 errors:0 dropped:0 overruns:0 frame:0
TX packets:521 errors:0 dropped:0 overruns:0 carrier:0
collisions:0 txqueuelen:0
RX bytes:1554003 (1.4 MiB)  TX bytes:1554003 (1.4 MiB)
[root@16071224 桌面]#

```
###编辑ifcfg-eth0配置改为如下
```

[root@16071224 network-scripts]#vim /etc/sysconfig/network-scripts/ifcfg-eth0
DEVICE=eth0
HWADDR=00:0C:29:E3:90:17 #改成刚才通过ifconfig命令获取到的
TYPE=Ethernet
UUID=70cf3d7e-6269-45cb-97c8-a1faf940c281
ONBOOT=yes #yes
NM_CONTROLLED=no #no
BOOTPROTO=none  #none
IPADDR=10.103.1.174 #改成一个根据ip分配规则不同于主机的ip地址
NETMASK=255.255.255.0 #255.255.255.0
DNS2=114.114.144.144
GATEWAY=192.168.1.1 #改成路由器网管就是刚才在windows上ipconfig /all获取的
DNS1=202.98.0.68 #随便比如谷歌8.8.8.8
USERCTL=no #no
PEERDNS=yes #yes
IPV6INIT=no
NAME=eth0 #网卡名字

```
###使配置生效
```

[root@16071224 network-scripts]# iptables -F # 清除路由规则
[root@16071224 network-scripts]#setenfore0
[root@16071224 network-scripts]#service neework restart # 重启网络服务
[root@16071224 network-scripts]# ping [本机ip] #通
[root@16071224 network-scripts]# ping [网关ip] # 通
[root@16071224 network-scripts]# ping [主机ip] # 通

```
配置完成

```
