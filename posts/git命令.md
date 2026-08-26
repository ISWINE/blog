---
title: git命令
date: 2026-08-27
tags: ["git"]
---
```
#快速设置 - 如果你以前做过这种事情
要么
HTTPS
SSH

git@github.com:lihuatedata/44.git
我们建议每个存储库都包含一个 README， LICENSE和.gitignore。

...或者在命令行上创建一个新的存储库
echo“＃44”>> README.md 
git init 
git add README.md 
git commit -m“第一次提交” 
git remote add origin git@github.com：lihuatedata / 44.git
 git push -u origin master
...或从命令行中推送现有的存储库
git remote add origin git@github.com：lihuatedata / 44.git
 git push -u origin master
...或从另一个存储库导入代码
您可以使用来自Subversion，Mercurial或TFS项目的代码初始化此存储库。



删除文件
在Git中，删除也是一个修改操作，我们实战一下，先添加一个新文件test.txt到Git并且提交：

$ git add test.txt
$ git commit -m "add test.txt"
[master 94cdc44] add test.txt
 1 file changed, 1 insertion(+)
 create mode 100644 test.txt
一般情况下，你通常直接在文件管理器中把没用的文件删了，或者用rm命令删了：

$ rm test.txt
这个时候，Git知道你删除了文件，因此，工作区和版本库就不一致了，git status命令会立刻告诉你哪些文件被删除了：

$ git status
# On branch master
# Changes not staged for commit:
#   (use "git add/rm <file>..." to update what will be committed)
#   (use "git checkout -- <file>..." to discard changes in working directory)
#
#       deleted:    test.txt
#
no changes added to commit (use "git add" and/or "git commit -a")
现在你有两个选择，一是确实要从版本库中删除该文件，那就用命令git rm删掉，并且git commit：

$ git rm test.txt
rm 'test.txt'
$ git commit -m "remove test.txt"
[master d17efd8] remove test.txt
 1 file changed, 1 deletion(-)
 delete mode 100644 test.txt
现在，文件就从版本库中被删除了。

另一种情况是删错了，因为版本库里还有呢，所以可以很轻松地把误删的文件恢复到最新版本：

$ git checkout -- test.txt
git checkout其实是用版本库里的版本替换工作区的版本，无论工作区是修改还是删除，都可以“一键还原”。

小结
命令git rm用于删除一个文件。如果一个文件已经被提交到版本库，那么你永远不用担心误删，但是要小心，你只能恢复文件到最新版本，你会丢失最近一次提交后你修改的内容。






git使用ssh密钥
2013年03月15日 17:26:11
阅读数：72762
git使用https协议，每次pull, push都要输入密码，相当的烦。
使用git协议，然后使用ssh密钥。这样可以省去每次都输密码。


大概需要三个步骤：
一、本地生成密钥对；
二、设置github上的公钥；
三、修改git的remote url为git协议。


一、生成密钥对。
=============
大多数 Git 服务器都会选择使用 SSH 公钥来进行授权。系统中的每个用户都必须提供一个公钥用于授权，没有的话就要生成一个。生成公钥的过程在所有操作系统上都差不多。首先先确认一下是否已经有一个公钥了。SSH 公钥默认储存在账户的主目录下的 ~/.ssh 目录。进去看看：
$ cd ~/.ssh 
$ ls
authorized_keys2  id_dsa       known_hosts config            id_dsa.pub
关键是看有没有用 something 和 something.pub 来命名的一对文件，这个 something 通常就是 id_dsa 或 id_rsa。有 .pub后缀的文件就是公钥，另一个文件则是密钥。假如没有这些文件，或者干脆连 .ssh 目录都没有，可以用 ssh-keygen 来创建。该程序在 Linux/Mac 系统上由 SSH 包提供，而在 Windows 上则包含在 MSysGit 包里：
$ ssh-keygen -t rsa -C "your_email@youremail.com"

# Creates a new ssh key using the provided email # Generating public/private rsa key pair.

# Enter file in which to save the key (/home/you/.ssh/id_rsa):

直接Enter就行。然后，会提示你输入密码，如下(建议输一个，安全一点，当然不输也行)：
Enter passphrase (empty for no passphrase): [Type a passphrase] 
# Enter same passphrase again: [Type passphrase again]
完了之后，大概是这样。
Your identification has been saved in /home/you/.ssh/id_rsa. 
# Your public key has been saved in /home/you/.ssh/id_rsa.pub. 
# The key fingerprint is: # 01:0f:f4:3b:ca:85:d6:17:a1:7d:f0:68:9d:f0:a2:db your_email@youremail.com
这样。你本地生成密钥对的工作就做好了。


二、添加公钥到你的github帐户
========================
1、查看你生成的公钥：大概如下：
$ cat ~/.ssh/id_rsa.pub  
ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAklOUpkDHrfHY17SbrmTIpNLTGK9Tjom/BWDSU GPl+nafzlHDTYW7hdI4yZ5ew18JH4JW9jbhUFrviQzM7xlE
LEVf4h9lFX5QVkbPppSwg0cda3 Pbv7kOdJ/MTyBlWXFCR+HAo3FXRitBqxiX1nKhXpHAZsMciLq8V6RjsNAQwdsdMFvSlVK/7XA t3FaoJoAsncM1Q9x5+3V
0Ww68/eIFmb1zuUFljQJKprrX88XypNDvjYNby6vw/Pb0rwert/En mZ+AW4OZPnTPI89ZPmVMLuayrD2cE86Z/il8b+gw3r3+1nKatmIkjn2so1d01QraTlMqVSsbx NrRFi9wrf+M7Q== schacon@agadorlaptop.local
2、登陆你的github帐户。然后 Account Settings -> 左栏点击 SSH Keys -> 点击 Add SSH key
3、然后你复制上面的公钥内容，粘贴进“Key”文本域内。 title域，你随便填一个都行。
4、完了，点击 Add key。

这样，就OK了。然后，验证下这个key是不是正常工作。
$ ssh -T git@github.com
# Attempts to ssh to github
如果，看到：
Hi username! You've successfully authenticated, but GitHub does not # provide shell access.
就表示你的设置已经成功了。


三、修改你本地的ssh remote url. 不用https协议，改用git 协议
================================================
可以用git remote -v 查看你当前的remote url
$ git remote -v

origin https://github.com/someaccount/someproject.git (fetch) origin https://github.com/someaccount/someproject.git (push)

可以看到是使用https协议进行访问的。

你可以使用浏览器登陆你的github，在上面可以看到你的ssh协议相应的url。类似如下：

git@github.com:someaccount/someproject.git

这时，你可以使用 git remote set-url 来调整你的url。

git remote set-url origin git@github.com:someaccount/someproject.git

完了之后，你便可以再用 git remote -v 查看一下。

OK。



至此，OK。

你可以用git fetch, git pull , git push， 现在进行远程操作，应该就不需要输入密码那么烦了。

```
