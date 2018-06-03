const remote = require('electron').remote;

let appLogic;
window.onload = function () {
    appLogic = new AppLogic();
};
var selectedLang = "en";
chooseLang();

class AppLogic {
    constructor() {
        AnimationTimer.startAnimationLoop();
        this.createUI();

        this.appData = new AppData();
        this.networkManager = new NetworkManager(this);
        this.loginPage = new Login(this);
        this.mainPage = new MainPage(this);
        this.cdnDownloader = new CDNdownloader(this);
        this.gameUpdated = this.gameUpdated();

        this.gameServerRepositories = [];

        this.showLoginPage();

        //Delay to avoid flashing of the top bar
        window.requestAnimationFrame(function () {
            window.setTimeout(function () {
                window.requestAnimationFrame(function () {
                    remote.getCurrentWindow().show();
                });
            }, 500);
        });
    };
    createUI() {
        this.mainDiv = CreateElement({
            type: 'div', class: 'AppLogic_MainDiv', elements: [
                this.navbar = CreateElement({
                    type: 'nav', class: 'AppLogic_Navbar nav-wrapper row', elements: [
                        this.titleDiv = CreateElement({
                            type: 'div', class: 'col s3 left-align', elements: [
                                CreateElement({ type: 'span', class: 'brand-logo', text: 'League of Memories' })
                            ]
                        }),
                        this.center = CreateElement({
                            type: 'div', class: 'col s6 center-align', elements: [
                                this.tabNav = CreateElement({
                                    type: 'div', elements: [
                                        this.playButton = CreateElement({ type: 'button', class: 'AppLogic_NavButtonSelected', text: this.translate("play") }),
                                        this.masteriesButton = CreateElement({ type: 'button', class: 'AppLogic_NavButton', text: this.translate("masteries") }),
                                        this.runesButton = CreateElement({ type: 'button', class: 'AppLogic_NavButton', text: this.translate("runes") }),
                                        this.settingsButton = CreateElement({ type: 'button', class: 'AppLogic_NavButton', text: this.translate("settings") })
                                    ]
                                }),
                            ]
                        }),
                        this.rightNav = CreateElement({
                            type: 'div', class: 'col s3 right-align', elements: [
                                this.minimize = CreateElement({ type: 'span', id: 'min-btn', class: 'fa fa-window-minimize AppLogic_Button' }),
                                this.maximize = CreateElement({ type: 'span', id: 'max-btn', class: 'fa fa-window-maximize AppLogic_Button' }),
                                this.close = CreateElement({ type: 'span', id: 'close-btn', class: 'fa fa-window-close AppLogic_Button' })
                            ]
                        })
                    ]
                }),
                this.goldBarDiv = CreateElement({ type: 'div', class: 'AppLogic_GoldBar' }),
                this.viewDiv = CreateElement({ type: 'div', class: 'AppLogic_ViewDiv' })
            ]
        });
        document.body.appendChild(this.mainDiv);

        document.getElementById("min-btn").addEventListener("click", function (e) {
            var window = remote.getCurrentWindow();
            window.minimize();
        });

        document.getElementById("max-btn").addEventListener("click", function (e) {
            var window = remote.getCurrentWindow();
            if (!window.isMaximized()) {
                window.maximize();
            } else {
                window.unmaximize();
            }
        });

        document.getElementById("close-btn").addEventListener("click", function (e) {
            var window = remote.getCurrentWindow();
            window.close();
        });
    };
    connectedToServer() {
        //Send nickname
    };
    loggedIn() {
        //Hide login page, show main page, 
        this.loginPage.getDiv().remove();
        this.showMainPage();
        this.updateGame();
        this.mainPage.addToChat(appLogic.translate("connectedAs") + " " + this.appData.nickname);
        this.mainPage.addToChat(appLogic.translate("useDiscord"));
        this.networkManager.sendNickname();
        this.networkManager.sendKey(this.appData.key);
    }
    failWhileLogin() {
        this.loginPage.loginButton.disabled = true;
        alert(appLogic.translate("errorLogin"))
    }
    showLoginPage() {
        this.loginPage.loginButton.disabled = false;
        this.viewDiv.appendChild(this.loginPage.getDiv());
    };
    updateGame() {
        var http = require('http');
        var fs = require('fs-extra');
        var jsonfile = require('jsonfile');
        var path2 = this.appData.getLeagueDirectory() + '/files.json'
        if (fs.existsSync(path2)) {
            fs.copySync(appLogic.appData.getLeagueDirectory() + '/files.json', appLogic.appData.getLeagueDirectory() + '/oldFiles.json');
            fs.unlinkSync(appLogic.appData.getLeagueDirectory() + '/files.json');
            var file = fs.createWriteStream(appLogic.appData.getLeagueDirectory() + "/files.json");
            var request = http.get("http://62.4.16.132:3000/files.json", function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    appLogic.cdnDownloader.readFiles();
                })
            });
        } else {
            var file = fs.createWriteStream(appLogic.appData.getLeagueDirectory() + "/files.json");
            var request = http.get("http://62.4.16.132:3000/files.json", function (response) {
                response.pipe(file);
                file.on('finish', function () {
                    appLogic.cdnDownloader.readFiles();
                })
            });
        }
    }
    showMainPage() {
        this.viewDiv.appendChild(this.mainPage.getDiv());
        var mainPage = this.mainPage;
        //For materialize
        $(document).ready(function () {
            $('select').material_select();
            $('.modal').modal();
            $('#selectSkin').on('click', function (e) {
                $('#modalSkin').modal('open');
                $('.carousel').carousel({ dist: -30 });
                $('.carousel').carousel('set', mainPage.selectedSkin);
            });
            $('#championSelect').on('change', function (e) {
                mainPage.championSelectChange();
            });
            mainPage.championSelectChange();
        });
    };
    gameUpdated() {
        this.mainPage.changeToLobbyView();
    }
    launchLeagueOfLegends(port, playerNum) {
        this.appData.lastConnectPort = port;
        this.appData.lastConnectPlayerNum = playerNum;

        console.log("Starting league with path: " + this.appData.getLeagueDirectory());
        console.log("with executable: " + this.appData.getExecutablePath());

        console.log("Arguments: " + this.appData.host + " " + port + " 17BLOhi6KZsTtldTsizvHg== " + playerNum);

        const spawn = require('child_process').spawn;
        var isMac = process.platform === 'darwin';
        var isWindows = process.platform === 'win32';
        if (isMac) {
            var executeCommand = "riot_launched=true ./Leagueoflegends 8394 LoLLauncher \"\" \"" + this.appData.host + " " + port + " 17BLOhi6KZsTtldTsizvHg== " + playerNum + "\"";

            console.log("Launched command: " + executeCommand);

            var exec = require('child_process').exec;
            exec(executeCommand, {
                cwd: this.appData.getExecutableDirectory()
            });
        }
        if (isWindows) {
            const game = spawn('cmd', ['/c', 'start', "", this.appData.getExecutablePath(), "8394", "LoLLauncher.exe", "", this.appData.host + " " + port + " 17BLOhi6KZsTtldTsizvHg== " + playerNum], { cwd: this.appData.getLeagueDirectory() });

        }
    };
    translate(string) {
        var lang = require('./Javascript/Lang/lang-' + selectedLang + '.js')
        return lang[string];

    }
};

function chooseLang() {
    console.log(navigator.language)
    var availableLang = ['en', 'es', 'ro', 'de', 'tr', 'fr', 'pt-BR']
    if (availableLang.indexOf(navigator.language)) {
        selectedLang = navigator.language;
    }
}
