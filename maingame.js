MainGame.instance = null;
MainGame.VERSION = "0.6.2";

function MainGame ()
{
    MainGame.instance = this;

    this.gameData = new GameData ();
    this.gameBoard = null;

    this.isGameOverAnim = false;
    this.cards = [];

// data store    
    this.dataId = FBInstant.context.getID ();

    if (this.dataId === null)
    {
        this.dataId = FBInstant.player.getID ();
    }

    // create DataStore
    new DataStore ();
}

MainGame.constructor = MainGame;

MainGame.prototype.loadAssets = function ()
{
    this.gameData.loadAssets ();
    this.gameData.createDeck ();
}

MainGame.prototype.log = function(message) 
{
    console.log (message);
//    this.socket.emit('console', message);
};

MainGame.prototype.update = function(dt) 
{
    if (this.gameData.isPlaying && this.gameData.doTimer)
    { this.cheatGame();
        this.gameData.time += dt;

        this.gameBoard.updateTime ();

        if (this.gameData.deck.isEmpty ())
        {
            var completed = true;

            for (var a = 0; a  < 4; a++)
            {
                if (this.gameBoard.foundationCards[a].uiCards.length < 13)
                    completed = false;
            }

            if (this.gameData.isAutoComplete == false)
            {
                if (completed)
                {
                    var sec = parseInt (MainGame.instance.gameData.time / 1000, 10);
                    sec = Math.max (sec, this.gameData.minTime);

                    this.gameData.timeBonus = parseInt (this.gameData.scoreBonus / sec, 10);
                    this.gameData.points = 0; 

                    this.addScore (XXXXX); #Changetoscoreyouwant
                    this.gameOver ();
                }
                else if (this.gameBoard.wasteCards.uiCards.length == 0)
                {
                    var allVisible = true;
                    for (var a = 0; a < 7; a++)
                    {
                        for (var b = 0; b < this.gameBoard.tableauCards[a].uiCards.length; b++)
                        {
                            if (!this.gameBoard.tableauCards[a].uiCards[b].card.visible == true)
                                allVisible = false;
                        }
                    }

                    if (allVisible)
                    {
                        this.gameBoard.showAutoComplete (true);
                    }
                }
            }
        }
    }
};

MainGame.prototype.doAutoComplete = function() 
{
    var delay = 0;
    var lowestCard = 0;
    var cards = [];
    
    for (var lowestCard = 0; lowestCard < 13; lowestCard++)
    {
        for (var a = 0; a < 7; a++)
        {
            for (var b = this.gameBoard.tableauCards[a].uiCards.length - 1; b >= 0; b--)
            {
                var uiCard = this.gameBoard.tableauCards[a].uiCards[b];

                if (uiCard.card.value == lowestCard)
                {
                    var isLast = false;

                    uiCard.data =  {
                        uiCard: uiCard,
                        parent: uiCard.parent,  // final parent
                        finalx: 0, 
                        finaly: 0
                    };

                    // get start location
                    var startPosition = uiCard.parent.toGlobal (uiCard.position);
                    uiCard.data.startPosition = MainGame.instance.gameBoard.cardLayer.toLocal (startPosition);

                    // find where we belong
                    if (lowestCard == 0)
                    {
                        for (var c = 0; c < 4; c++)
                        {
                            var collection = this.gameBoard.foundationCards[c];

                            if (collection.uiCards.length == 0)
                            {
                                collection.addCard (uiCard);
                            }
                        }
                    }
                    else
                    {
                        for (var c = 0; c < 4; c++)
                        {
                            var collection = this.gameBoard.foundationCards[c];

                            if (collection.uiCards[0].card.suit == uiCard.card.suit)
                            {
                                collection.addCard (uiCard);
                            }
                        }
                    }
            
                    // get final position and parent
                    uiCard.data.parent = uiCard.parent;
                    uiCard.renderable = true; 

                    var endPosition = uiCard.parent.toGlobal (uiCard.position);
                    uiCard.data.endPosition = MainGame.instance.gameBoard.cardLayer.toLocal (endPosition);

                    cards.push (uiCard);
                }
            }
        }    
    }

    for (var a = cards.length - 1; a >= 0; a--)
    {
        uiCard = cards[a];

        uiCard.setParent (MainGame.instance.gameBoard.cardLayer);
        this.autoCompleteTween (uiCard.data, a * 75, a == cards.length - 1);
    }

    this.gameData.isAutoComplete = true;
}

MainGame.prototype.autoCompleteTween = function (obj, delay, isLast)
{
    obj.x = obj.uiCard.position.x = obj.startPosition.x;
    obj.y = obj.uiCard.position.y = obj.startPosition.y;
    obj.isLast = isLast;

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.endPosition.x, y: obj.endPosition.y }, 150)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.renderable = true;
        })
        .onComplete (function () {
            this.uiCard.setParent (this.parent);
            this.uiCard.position.x = this.finalx;
            this.uiCard.position.y = this.finaly;
            this.uiCard.data = null;

            if (this.isLast)
            {
                MainGame.instance.gameData.isAutoComplete = false;
            }
        })
        .easing(TWEEN.Easing.Quadratic.In)
        .delay (delay)
        .start();
}

MainGame.prototype.retire = function() 
{
    Analytics.instance.trackEvent ("ROUND_END", {
        room_id: 0, 
        level_cd: 0, 
        stars: 0, 
        score: this.gameData.score, 
        regular_curr_balance: 0, 
        premiun_curr_balance: 0, 
        spcecial_curr_balance: 0,
        result_type: "quit"
    });

    FBInstant.logEvent(
        'GameComplete',
        0,
        {
            score: this.gameData.score, 
            deck: this.gameData.deckString,
            result_type: "quit"
        }
    );

    var obj = {
            "id": MainGame.instance.dataId.toString () + "_" + this.gameData.deckString,
            "contextId": [
                {
                    "id": MainGame.instance.dataId,
                    "deck": this.gameData.deckString,
                    "result": "quit",
                    "moves": this.gameData.moves,
                    "time": this.gameData.time,
                    "score": this.gameData.score,
                    "played": MainGame.instance.gameData.playerInfo.gamesplayed,
                    "won": MainGame.instance.gameData.playerInfo.gameswon 
                }
            ]
        };

    DataStore.instance.storeData (obj, function (json) {
            console.log (json);
        });

    this.gameData.isPlaying = false;
    this.gameData.timeBonus = 0;
    this.gameData.score = this.gameData.points;

    this.gameBoard.showGameOver (true, this.gameData.points, this.gameData.timeBonus, this.gameData.score);

    setTimeout(function(){
        FBInstant.sendScreenshotAsync(MainGame.instance.renderer.extract.base64()).then(function() {
            console.log('Screenshot sent!');
        }).catch(function(error) {
            console.log('Failed to send screenshot.');
            console.log(error.toString());
        });
    }, 1500);

    setTimeout(function(){
        FBInstant.endGameAsync().then(function() {
            MainGame.instance.newGame ();
        });
    }, 1750);
}

MainGame.prototype.gameOver = function() 
{
    Analytics.instance.trackEvent ("ROUND_END", {
        room_id: 0, 
        level_cd: 0, 
        stars: 0, 
        score: this.gameData.score, 
        regular_curr_balance: 0, 
        premiun_curr_balance: 0, 
        spcecial_curr_balance: 0,
        result_type: "win"
    });

    FBInstant.logEvent(
        'GameComplete',
        0,
        {
            score: this.gameData.score, 
            deck: this.gameData.deckString,
            moves: this.gameData.moves,
            gameId: MainGame.instance.gameData.playerInfo.gamesplayed,
            result_type: "win"
        }
    );

    if (this.gameData.score > MainGame.instance.gameData.playerInfo.highscore)
        MainGame.instance.gameData.playerInfo.highscore = this.gameData.score;

    MainGame.instance.gameData.playerInfo.gameswon++;
    MainGame.instance.gameData.playerInfo.uploadStats ();

    var obj = {
            "id": MainGame.instance.dataId.toString () + "_" + this.gameData.deckString,
            "contextId": [
                {
                    "id": MainGame.instance.dataId,
                    "deck": this.gameData.deckString,
                    "result": "win",
                    "moves": this.gameData.moves,
                    "time": this.gameData.time,
                    "score": this.gameData.score,
                    "played": MainGame.instance.gameData.playerInfo.gamesplayed,
                    "won": MainGame.instance.gameData.playerInfo.gameswon 
                }
            ]
        };

    DataStore.instance.storeData (obj, function (json) {
            console.log (json);
        });

    this.gameData.isPlaying = false;

    this.gameBoard.showGameOver (true, this.gameData.points, this.gameData.timeBonus, this.gameData.score);

    var delay = 0;
    var uiCard;

    this.isGameOverAnim = true;
    this.cards = [];

    // first spread of cards
    for (var b = 0; b < 13; b++)
    {
        for (var a = 0; a < 4; a++)
        {
            var uiCard = this.gameBoard.foundationCards[a].uiCards[this.gameBoard.foundationCards[a].uiCards.length - 1];

            this.gameBoard.foundationCards[a].removeCards (uiCard);

            this.tweenFinalCardSpread (a, uiCard, delay);
            this.cards.push (uiCard);
        }
    }

    MainGame.instance.gameData.playSpread ();

    // start second phase
    setTimeout (function () 
    {
        FBInstant.sendScreenshotAsync(MainGame.instance.renderer.extract.base64()).then(function() {
            console.log('Screenshot sent!');
        }).catch(function(error) {
            console.log('Failed to send screenshot.');
            console.log(error.toString());
        });

        for (var a = 0; a < MainGame.instance.cards.length; a++)
        {
            var uiCard = MainGame.instance.cards[a];

            MainGame.instance.tweenFinalCardSpread2 (uiCard.data);
        }

        setTimeout (function ()
        {
            MainGame.instance.gameData.playSpread ();
        }, 700);
    }, 3000);

    setTimeout(function(){
        FBInstant.endGameAsync().then(function() {
            MainGame.instance.newGame ();
        });
    }, 4000);
}

MainGame.prototype.tweenFinalCardSpread = function (a, uiCard, delay)
{
    uiCard.timeout = setTimeout (function ()
    {
        var startPosition = MainGame.instance.gameBoard.foundationCards[a].toGlobal (uiCard.position);
        var endPosition = MainGame.instance.gameBoard.uiDeck.parent.toGlobal (MainGame.instance.gameBoard.uiDeck.position);
        uiCard.setParent (MainGame.instance.gameBoard.cardLayer);

        startPosition = uiCard.parent.toLocal (startPosition);
        endPosition = uiCard.parent.toLocal (endPosition);

        var randomPosition = {
            x: 300 - Math.random () * 600,
            y: MainGame.instance.gameData.height / 2 + 300 - Math.random () * 600,
        };

        obj = {
            uiCard: uiCard,
            startPosition: startPosition,
            randomPosition: randomPosition,
            midPosition: {
                    x: 0,
                    y: MainGame.instance.gameData.height / 2
                },
            endPosition: endPosition,
            parent: MainGame.instance.gameBoard.uiDeck,
            finalx: 0,
            finaly: 0
        }

        obj.x = uiCard.position.x = startPosition.x;
        obj.y = uiCard.position.y = startPosition.y;
        
        MainGame.instance.tweenFinalCardSpread1 (obj);
    }, delay + 10);
}

// goto random position
MainGame.prototype.tweenFinalCardSpread1 = function (obj)
{
    obj.x = obj.uiCard.position.x = obj.startPosition.x;
    obj.y = obj.uiCard.position.y = obj.startPosition.y;
    obj.rotation = 0;
    obj.uiCard.data = obj;
    obj.finalRotation = Math.random () * 2 * Math.PI;

    if (obj.uiCard.timeout)
    {
        clearTimeout (obj.uiCard.timeout);
        obj.uiCard.timeout = null; 
    }

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.randomPosition.x, y: obj.randomPosition.y, rotation: obj.finalRotation}, 700)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.rotation = this.rotation;
        })
        .onComplete (function () {
            // goto middle
//            MainGame.instance.tweenFinalCardSpread2 (uiCard.data);
        })
        .delay (500)
        .start();
}

// goto mid location
// 700ms
MainGame.prototype.tweenFinalCardSpread2 = function (obj)
{
    obj.uiCard.data = obj;

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.midPosition.x, y: obj.midPosition.y, rotation: 0}, 700)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.rotation = this.rotation;
        })
        .onComplete (function () {
            MainGame.instance.tweenFinalCardSpread3 (obj);

            // take screen shot???
        })
        .start();
}

// go offscreen
// 300ms
MainGame.prototype.tweenFinalCardSpread3 = function (obj)
{
    obj.uiCard.data = obj;

    if (obj.uiCard == this.cards[this.cards.length - 1])
    {
        obj.uiCard.renderable = false;
    }

    var x = (obj.endPosition.x + obj.uiCard.position.x) / 2;
    var y = (obj.endPosition.y + obj.uiCard.position.y) / 2;

    obj.uiCard.tween = new TWEEN.Tween(obj)
//        .to({ x: x, y: y, scale: 0}, 300)
        .to({ x: obj.endPosition.x + 320, y: obj.endPosition.y}, 300)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
        })
        .onComplete (function () {
            MainGame.instance.tweenFinalCardSpread4 (obj);
        })
        .start();
}

// goto deck position
// 300ms
MainGame.prototype.tweenFinalCardSpread4 = function (obj)
{
    obj.uiCard.data = obj;
    obj.uiCard.card.visible = false;
    obj.uiCard.bindUI ();

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.endPosition.x, y: obj.endPosition.y}, 300)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
        })
        .start();
}

MainGame.prototype.tweenFinalCard = function (a, uiCard, delay)
{
    uiCard.timeout = setTimeout (function ()
    {
        var startPosition = MainGame.instance.gameBoard.foundationCards[a].toGlobal (uiCard.position);
        var endPosition = MainGame.instance.gameBoard.uiDeck.parent.toGlobal (MainGame.instance.gameBoard.uiDeck.position);
        uiCard.setParent (MainGame.instance.gameBoard.cardLayer);

        startPosition = uiCard.parent.toLocal (startPosition);
        endPosition = uiCard.parent.toLocal (endPosition);

        var midPosition = {};
        midPosition.x = (endPosition.x + startPosition.x) / 2;
        midPosition.y = (endPosition.y + startPosition.y) / 2;
        midPosition.y += Math.random () * 50 + 50;

        obj = {
            uiCard: uiCard,
            startPosition: startPosition,
            midPosition: midPosition,
            endPosition: endPosition,
            parent: MainGame.instance.gameBoard.uiDeck,
            finalx: 0,
            finaly: 0
        }

        obj.x = uiCard.position.x = startPosition.x;
        obj.y = uiCard.position.y = startPosition.y;
        
        MainGame.instance.tweenFinalCard1 (obj);
    }, delay + 10);
}

MainGame.prototype.tweenFinalCard1 = function (obj)
{
    obj.x = obj.uiCard.position.x = obj.startPosition.x;
    obj.y = obj.uiCard.position.y = obj.startPosition.y;
    obj.scale = 1;
    obj.rotation = 0;
    obj.uiCard.data = obj;

    if (obj.uiCard.timeout)
    {
        clearTimeout (obj.uiCard.timeout);
        obj.uiCard.timeout = null; 
    }

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.midPosition.x, y: obj.midPosition.y, scale: 0, rotation: -Math.PI}, 500)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.scale.x = this.scale;
            this.uiCard.rotation = this.rotation;
        })
        .onComplete (function () {
            MainGame.instance.tweenFinalCard2 (this);

            this.uiCard.card.visible = false;
            this.uiCard.bindUI ();
        })
        .easing(TWEEN.Easing.Quadratic.In)
        .start();
}

MainGame.prototype.tweenFinalCard2 = function (obj)
{
    obj.x = obj.uiCard.position.x = obj.midPosition.x;
    obj.y = obj.uiCard.position.y = obj.midPosition.y;
    obj.scale = 0;
    obj.rotation = -Math.PI;
    obj.uiCard.data = obj;

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.endPosition.x, y: obj.endPosition.y, scale: 1, rotation: -Math.PI * 2}, 400)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.scale.x = this.scale;
            this.uiCard.rotation = this.rotation;
        })
        .onComplete (function () {
            MainGame.instance.gameBoard.uiDeck.deckCard.renderable = true;
            UICardManager.instance.addCard (this.uiCard);
            this.parent.removeChild (this.uiCard);

            TWEEN.remove(this.uiCard.tween);
            delete (this.uiCard.data); 
            delete (this.uiCard.tween); 
        })
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

MainGame.prototype.addScore = function(points) 
{
    this.gameData.score = Math.max (this.gameData.score + points, 0); // min score = 0
    this.gameBoard.animateScore (points);

    FBInstant.setScore(this.gameData.score);
}

MainGame.prototype.incMoves = function() 
{
    this.gameData.moves++;
    MainGame.instance.gameBoard.updateMoves ();
}

MainGame.prototype.clear = function() 
{
    console.log ("MainGame clear");
    this.gameData.clear();
    this.gameBoard.clear();
};

MainGame.prototype.undoMove = function() 
{
    var uiCard = null;

    if (this.gameData.history.length > 0)
    {
        var event = this.gameData.history.pop ();

        switch (event.type)
        {
            case "deck":
                // no cards shown, so must have just turned the deck
                if (this.gameBoard.wasteCards.uiCards.length == 0)
                {
                    while (!this.gameData.deck.isEmpty ())
                    {
                        uiCard = UICardManager.instance.getCard ();
                        uiCard.card = this.gameData.deck.dealCard ();

                        this.gameBoard.wasteCards.addCard (uiCard, true);
                    }
                }
                else
                {
                    var lastCard = this.gameBoard.wasteCards.uiCards.length - 1;
                    uiCard = this.gameBoard.wasteCards.uiCards[lastCard];
                    this.gameBoard.wasteCards.uiCards.splice (lastCard, 1);

                    this.gameData.deck.insertAtTop (uiCard.card);
                    UICardManager.instance.addCard (uiCard);
                }

                this.addScore (this.gameData.undoPoints);
                break;

            case "move":
                if (event.oldOwner.isFoundation)
                {
                }
                else if (event.oldOwner.isTableau)
                {
                    if (event.turned == true && event.oldOwner.uiCards.length > 0)
                    {
                        event.oldOwner.uiCards[event.oldOwner.uiCards.length - 1].card.visible = false;
                        event.oldOwner.uiCards[event.oldOwner.uiCards.length - 1].bindUI ();
                    }
                }
                else if (event.oldOwner.isWaste)
                {
                }

                uiCard = event.newOwner.uiCards[event.newPosition];
                var cards = event.newOwner.removeCards (uiCard);

                if (this.gameData.undoPerPoint)
                    this.addScore (cards.length * this.gameData.undoPoints);
                else
                    this.addScore (this.gameData.undoPoints);

                event.oldOwner.addCards (cards);
                break;
        }

        this.incMoves ();
        this.gameBoard.bindUI ();
        this.gameBoard.updateScore ();
        this.gameBoard.updateMoves ();
    }

    MainGame.instance.gameData.playUndo ();
}

MainGame.prototype.turnCard = function() 
{
    var uiCard = null;
    var cardsTurned = Math.min (this.gameData.deck.cardsTurned, this.gameData.deck.getSize ());
    this.gameData.doTimer = true;

    if (this.gameData.deck.isEmpty () && this.gameBoard.wasteCards.uiCards.length == 0)
    {
        return;
    }

    if (this.gameData.deck.isEmpty ())
    {
        console.log ("Recycle Waste");

        while (this.gameBoard.wasteCards.uiCards.length > 0)
        {
            // get first card and remove from list
            uiCard = this.gameBoard.wasteCards.uiCards[0];
            this.gameBoard.wasteCards.uiCards.splice (0, 1);

            // set new child to point to waste parent
            if (this.gameBoard.wasteCards.uiCards.length > 0)
                this.gameBoard.wasteCards.uiCards[0].setParent (this.gameBoard.wasteCards);

            // add card back to deck
            this.gameData.deck.addCard (uiCard.card);

            // move uiCard to Card Manager
            UICardManager.instance.addCard (uiCard);
        }

        this.addScore (this.gameData.wastePoints);

        MainGame.instance.gameData.playUndo ();
    }
    else
    {
        UICard.canClick = false;

        for (var a = 0; a < cardsTurned; a++)
        {
            uiCard = UICardManager.instance.getCard ();
            uiCard.card = this.gameData.deck.dealCard ();

            if (uiCard.owner != null || uiCard.oldParent != null)
            {
                console.log ("Error");
            }

//            console.log ("Turn Card: " + uiCard.card.value.toString () + " of " + uiCard.card.suitString())

            uiCard.data =  {
                uiCard: uiCard,
                parent: uiCard.parent,  // final parent
                finalx: 0, 
                finaly: 0,
                oldOwner: MainGame.instance.gameBoard.uiDeck
            };

            var zero = new PIXI.Point(0, 0);

            // get start location
            var startPosition = MainGame.instance.gameBoard.uiDeck.toGlobal (zero);
            uiCard.data.startPosition = MainGame.instance.gameBoard.cardLayer.toLocal (startPosition);

            this.gameBoard.wasteCards.addCard (uiCard, true);

            // get final position and parent
            uiCard.data.parent = uiCard.parent; 

            var endPosition = uiCard.parent.toGlobal (uiCard.position);
            uiCard.data.endPosition = MainGame.instance.gameBoard.cardLayer.toLocal (endPosition);
            uiCard.setParent (MainGame.instance.gameBoard.cardLayer);
            uiCard.tweenCard (uiCard.data, 0);
        }

        this.gameData.playFlipSound ();
    }

    this.incMoves ();

    this.gameData.addHistoryEvent ({
        type: "deck",
        count: cardsTurned
    });

    this.gameBoard.updateScore ();
    this.gameBoard.updateMoves ();
    this.gameBoard.uiDeck.bindUI ();
};

MainGame.prototype.newGame = function(seed) 
{
    Analytics.instance.trackEvent ("ROUND_START", {
            room_id: 0, 
            level_cd: 0, 
            regular_curr_balance: 0, 
            premium_curr_balance: 0,
            regular_cur_balance: 0, 
            special_curr_balance: 0, 
            round_id: MainGame.instance.gameData.playerInfo.gamesplayed
        });

    console.log ("New Game");
    console.log ("UICardManager: " + UICardManager.instance.uiCards.length);

    if (this.isGameOverAnim)
    {
        for (var a = 0; a < this.cards.length; a++)
        {
            var uiCard = this.cards[a];

            if (uiCard.timeout)
            {
                clearTimeout (uiCard.timeout);
                delete (uiCard.timeout); 
            }

            if (uiCard.tween)
            {
                uiCard.tween.stop ();
                TWEEN.remove(uiCard.tween);
                delete (uiCard.tween); 
            }

            if (uiCard.tween)
            {
                delete (uiCard.data); 
            }
            
            if (uiCard.parent != UICardManager.instance)
            {
                UICardManager.instance.addCard (uiCard);
            }
        }
    }

    // kill all tweens
    TWEEN.removeAll ();

    if (seed != undefined)
    {

    }

    console.log ("UICardManager: " + UICardManager.instance.uiCards.length);

    this.clear ();

    this.gameBoard.showGameOver (false);
    this.gameBoard.showAutoComplete (false);

    if (MainGame.instance.gameData.playerInfo.gamesplayed > 0)
        this.gameData.createDeck ();
    else
    {
        var starterDecks = [
            "3sThQcTc8c3cJd5s4cKc4s8h2d2h6dAsKh7sJs2c4dQd9d9h2s7hJhAc8sAd7dQh8d5d5c6cTs3d4h6sTdKsJc9s9cKd7cAh3h6hQs5h",
            "Qh9dQc3s9s3h8cQsAc3cJdAsTdThKsKdJc4h4s8hTc4c6c8d4dJh2s5d5s8sAh6dAd9h7d6h3d9c5h2cTsKc6s7h7cKhJs2h2d5c7sQd",
            "5d7sJdQs2s9hTsAcKh9sJhKs4hAdQhTd2h3hQd4c8h3c3sTh2cAs8s7cAh5h6c2d7d9c7h6h6dJc8dJs4d8cTcKd5s4s6s5cQcKc9d3d",
            "5c6hJdTd3s9h8cJsKd9dKs5sTcAc8s5d8h2sAsQc2dKhQh7d4c4h7cTh2c9s3h9cAd6cJc2h7hJh6sQdTs3dQs4d4s6dKc5h7s8d3cAh",
            "7c6s8d5d6c9d2dKhTcTdKc2c4dAsJcAd7h8sQc6d2s4cQhQs7sJh5sKdJd9c8cQdTh4s6h8h9sJs3c2hKs3sTs7dAcAh5c3d3h4h9h5h"
        ];

        var rand = (Math.random () * starterDecks.length);
        rand = Math.floor (rand);

        this.gameData.deck.parseDeck (starterDecks[rand]);

        this.deckString = starterDecks[rand];
    }

    this.gameBoard.bindUI ();
    this.gameBoard.updateScore ();
    this.gameBoard.updateMoves ();
    this.gameBoard.updateTime ();

    FBInstant.logEvent(
        'GameStarted',
        0,
        {
            score: this.gameData.score, 
            deck: this.gameData.deckString,
            gameId: MainGame.instance.gameData.playerInfo.gamesplayed
        }
    );

    MainGame.instance.gameData.playerInfo.gamesplayed++;
    MainGame.instance.gameData.playerInfo.uploadStats ();

    this.processDeal ();

    this.gameData.playDeal ();
};

MainGame.prototype.processDeal = function ()
{
    var uiCard = null;
    var delay = 0;
    var zero = new PIXI.Point(0, 0);
    var startPosition = this.gameBoard.uiDeck.toGlobal (zero);

    console.log ("ProcessDeal UICardManager: " + UICardManager.instance.uiCards.length);

    // deal cards
    for (var a = 0; a < 7; a++)
    {
        for (var b = a; b < 7; b++)
        {
            uiCard = UICardManager.instance.getCard ();
            uiCard.card = this.gameData.deck.dealCard ();

            if (uiCard.parent != UICardManager.instance)
            {
                console.log ("error");
            }

            this.gameBoard.tableauCards[b].addCard (uiCard, a == b);
            this.gameBoard.tableauCards[b].bindUI (); // attach and display it correct position

            uiCard.data =  {
                uiCard: uiCard,
                parent: uiCard.parent,
                finalx: uiCard.position.x,
                finaly: uiCard.position.y
            };

            var endPosition = uiCard.parent.toGlobal (uiCard.position);
            uiCard.data.endPosition = this.gameBoard.cardLayer.toLocal (endPosition);
            uiCard.data.startPosition = this.gameBoard.cardLayer.toLocal (startPosition);
        }
    }

    var rad = 0;
    var rand = Math.random ();

    for (var a = 0; a < 7; a++)
    {
        for (var b = a; b < 7; b++)
        {
            uiCard = this.gameBoard.tableauCards[b].uiCards[a];

            uiCard.setParent (this.gameBoard.cardLayer);
            uiCard.renderable = false;

// from bottom
            if (rand < 0.5)
            {
                uiCard.data.startPosition.x = 0;
                uiCard.data.startPosition.y = this.gameData.height + 200;
            }   

            this.processDealCard (uiCard.data, delay, a == 6 && b == this.gameBoard.tableauCards[b].uiCards.length - 1);
            
            delay += 75;
            rad += 0.5;
        }
    }

    this.gameData.isDealing = true;
    this.gameData.isPlaying = false;
}

MainGame.prototype.processDealCard = function (obj, delay, last)
{
    obj.x = obj.uiCard.position.x = obj.startPosition.x;
    obj.y = obj.uiCard.position.y = obj.startPosition.y;
    obj.last = last;

    obj.uiCard.tween = new TWEEN.Tween(obj)
        .to({ x: obj.endPosition.x, y: obj.endPosition.y }, 400)
        .onUpdate(function() {
            this.uiCard.position.x = this.x;
            this.uiCard.position.y = this.y;
            this.uiCard.renderable = true;
        })
        .onComplete (function () {
            this.uiCard.setParent (this.parent);
            this.uiCard.position.x = this.finalx;
            this.uiCard.position.y = this.finaly;

            delete (this.uiCard.data); 
            delete (this.uiCard.tween); 

            if (this.last)
            {
                MainGame.instance.dealDone ();
            }            
        })
        .easing(TWEEN.Easing.Quadratic.In)
        .delay (delay)
        .start();
}

MainGame.prototype.dealDone = function ()
{
    console.log ("dealDone UICardManager: " + UICardManager.instance.uiCards.length);

    for (var a = 0; a < 7; a++)
    {
        console.log ("tableauCards: " + this.gameBoard.tableauCards[a].uiCards.length);
    }
    MainGame.instance.gameData.isDealing = false;
    MainGame.instance.gameData.isPlaying = true;
}

MainGame.prototype.showInfoPanel = function ()
{
    if (this.gameData.infoPanel === undefined)
    {
        this.gameData.infoPanel = new UIInfoPanel ();
        this.gameBoard.addChild (this.gameData.infoPanel);
    }

    var obj = {
        panel: this.gameData.infoPanel,
        x: 0.1,
        y: 0.1,
        alpha: 0
    }

    this.gameData.infoPanel.alpha = 0;
    this.gameData.infoPanel.scale.x = this.gameData.infoPanel.scale.y = 0.1;

    new TWEEN.Tween(obj)
        .to({ x: 1, y: 1, alpha: 1}, 200)
        .onUpdate(function() {
            this.panel.scale.x = this.x;
            this.panel.scale.y = this.y;
            this.panel.alpha = this.alpha;
        })
        .easing(TWEEN.Easing.Quadratic.In)
        .start();
    
    this.gameData.infoPanel.renderable = !this.gameData.infoPanel.renderable;
}

MainGame.prototype.cheatGame = function ()
{    
    this.gameData.deck.clear();
    this.gameBoard.clear();
    UICardManager.instance.clear ();

    this.gameData.deck.createDeck ();

    for (var a = 0; a < 4; a++)
    {
        for (var b = 0;b < 13; b++)
        {
            var uiCard = UICardManager.instance.getCard ();
            uiCard.card = this.gameData.deck.dealCard ();
            uiCard.card.visible = true;
            uiCard.bindUI ();

            this.gameBoard.foundationCards[a].addCard (uiCard);
            this.gameBoard.bindUI ();
        }
    }

    this.gameData.doTimer = true;
}

MainGame.prototype.getJSON = function(url, callback) 
{
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true);
    xhr.responseType = "json";
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        callback(xhr.response);
      } else {
        callback(status);
      }
    };

    xhr.send();
};

MainGame.prototype.sendJSON = function(url, json, callback) 
{
    // Sending and receiving data in JSON format using POST mothod
    //
    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () { 
        if (xhr.readyState == 4 && xhr.status == 200) {
            var json = JSON.parse(xhr.responseText);
            callback (json);
        }
    }

    xhr.send(JSON.stringify(json));
}
