import { useEffect, useState } from "react";
import abi from "./abi.json";
import tama from "./tama.png";
import monadLogo from "./monad-logo.png";
import { ethers } from "ethers";
const CONTRACT_ADDRESS = "0xbb794f7DcbCDa76D7d9994BbF49b8e53F01253F0"; // GANTI!

function detectPrimaryWallet() {
  if (!window.ethereum) return null;
  if (window.ethereum.isMetaMask) return { key: "metamask", name: "MetaMask", provider: window.ethereum };
  if (window.ethereum.isHaha) return { key: "haha", name: "HaHa Wallet", provider: window.ethereum };
  if (window.ethereum.isRabby) return { key: "rabby", name: "Rabby", provider: window.ethereum };
  if (window.ethereum.isOKXWallet) return { key: "okx", name: "OKX Wallet", provider: window.ethereum };
  if (window.ethereum.isPhantom) return { key: "phantom", name: "Phantom (EVM)", provider: window.ethereum };
  if (window.ethereum.isBitKeep) return { key: "bitkeep", name: "BitKeep", provider: window.ethereum };
  if (window.ethereum.isTokenPocket) return { key: "tokenpocket", name: "TokenPocket", provider: window.ethereum };
  if (window.ethereum.isTrust) return { key: "trust", name: "Trust Wallet", provider: window.ethereum };
  return { key: "unknown", name: "Detected EVM Wallet", provider: window.ethereum };
}
function detectLegacyHahaWallet() {
  if (window.hahaEthereum) return { key: "hahaLegacy", name: "HaHa Wallet (Legacy)", provider: window.hahaEthereum };
  return null;
}

function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [myPet, setMyPet] = useState(undefined);
  const [detectedWallet, setDetectedWallet] = useState(null);
  const [status, setStatus] = useState("");
  const [minting, setMinting] = useState(false);

  // Detect wallet (only active one) & listen chain/account changes
  useEffect(() => {
    const w = detectPrimaryWallet();
    if (w) setDetectedWallet(w);
    else {
      const hahaLeg = detectLegacyHahaWallet();
      if (hahaLeg) setDetectedWallet(hahaLeg);
    }
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  // Fetch pet status
  async function fetchPetNow() {
    if (contract && account) {
      try {
        const [id, happiness, hunger, prankCounter] = await contract.getPetStatus(account);
        setMyPet({
          id: id.toString(),
          happiness: happiness.toString(),
          hunger: hunger.toString(),
          prankCounter: prankCounter.toString(),
        });
        return true;
      } catch (e) {
        setMyPet(null);
        return false;
      }
    }
    setMyPet(null);
    return false;
  }

  useEffect(() => {
    let intv;
    if (contract && account) {
      fetchPetNow();
      intv = setInterval(fetchPetNow, 5000);
    }
    return () => clearInterval(intv);
  }, [contract, account]);

  // Connect wallet
  async function connectWallet() {
    setStatus("");
    if (!detectedWallet) {
      setStatus("No wallet provider available.");
      return;
    }
    try {
      const ethersProvider = new ethers.BrowserProvider(detectedWallet.provider);
      await ethersProvider.send("eth_requestAccounts", []);
      const signer = await ethersProvider.getSigner();
      const addr = await signer.getAddress();
      setAccount(addr);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, abi, signer));
      setStatus("");
    } catch (e) {
      setStatus("Wallet connection failed: " + (e.reason || e.message));
    }
  }

  // Mint, Feed, Play
  async function doMint() {
    if (!contract) return;
    setMinting(true);
    setStatus("Minting your Tamagotchi...");
    try {
      const tx = await contract.mint();
      setStatus("Waiting for blockchain confirmation...");
      if (tx.wait) await tx.wait();
      await fetchPetNow();
      setStatus("Mint successful! Your Tamagotchi is here.");
    } catch (e) {
      setStatus("Mint failed: " + (e.reason || e.message));
    }
    setMinting(false);
  }

  async function doFeed() {
    if (!contract) return;
    setStatus("Feeding...");
    try {
      await contract.feed();
      setStatus("Your Tamagotchi enjoyed the food!");
    } catch (e) {
      if ((e.reason || e.message)?.includes("User has no Tamagotchi")) {
        setStatus("You have no Tamagotchi. Please mint one first!");
        setMyPet(null);
      } else {
        setStatus("Feed failed: " + (e.reason || e.message));
      }
    }
  }

  async function doPlay() {
    if (!contract) return;
    setStatus("Playing...");
    try {
      await contract.play();
      setStatus("Your Tamagotchi is so happy! 🎉");
    } catch (e) {
      if ((e.reason || e.message || "").includes("User has no Tamagotchi")) {
        setStatus("You have no Tamagotchi. Please mint one first!");
        setMyPet(null);
      } else if ((e.reason || e.message || "").includes("Already max happy")) {
        setStatus("Already maximally happy! Try prank or wait before playing again.");
      } else {
        setStatus("Play failed: " + (e.reason || e.message));
      }
    }
  }

  // UI
  return (
    <div className="wrapper">
      {/* Monad logo header */}
      <img
        src={monadLogo}
        alt="Monad Logo"
        style={{
          width: 58,
          margin: "16px auto 6px",
          display: "block"
        }}
      />
      <h1>Tamagotchi Monad</h1>
      <img src={tama} alt="Tamagotchi" style={{
        width: 90, margin: "13px auto 11px", borderRadius: "20px", boxShadow: "0 2px 14px #ac8bf078"
      }} />

      <div className="card">
        <div style={{ marginBottom: "9px", width: "100%" }}>
          <span style={{ fontWeight: 600 }}>Wallet:</span>
          <span style={{
            wordBreak: "break-all", fontFamily: "monospace", fontSize: 13, color: "#7d1ac2",
            marginLeft: 8
          }}>{account ? account : "Not Connected"}</span>
        </div>
        {!account &&
          <div style={{ margin: "12px 0" }}>
            {detectedWallet ?
              <button style={{ minWidth: 130 }} onClick={connectWallet}>
                Connect {detectedWallet.name}
              </button>
              :
              <div style={{ color: "#c13822" }}>
                No EVM wallet detected. <br />
                Please install/activate MetaMask, HaHa, etc.
              </div>
            }
          </div>
        }

        {/* Mint ALWAYS visible if no pet */}
        {account && (myPet === null || myPet === undefined) &&
          <div style={{ width: "100%", marginTop: 12 }}>
            <button onClick={doMint} disabled={minting}>
              {minting ? "Minting..." : "Mint Tamagotchi"}
            </button>
            <p style={{ marginTop: 10, color: "#9432b4", fontWeight: 500 }}>
              You don't have a Tamagotchi yet.<br />Please mint one to start!
            </p>
          </div>
        }
        {account && myPet &&
          <div style={{ width: "100%" }}>
            <div className="stat-group">
              <div>❤️ Happiness<br /><b>{myPet.happiness}</b></div>
              <div>🍔 Hunger<br /><b>{myPet.hunger}</b></div>
              <div>😜 Pranked<br /><b>{myPet.prankCounter}</b></div>
            </div>
            <div style={{
              display: "flex", gap: 13, justifyContent: "center", marginTop: 18
            }}>
              <button onClick={doFeed}>Feed</button>
              <button onClick={doPlay}>Play</button>
            </div>
          </div>
        }
        {status && (
          <div style={{
            marginTop: 13, marginBottom: 7, color: "#9739c8", fontWeight: 500, fontSize: "1.03em"
          }}>{status}</div>
        )}
      </div>

      {/* Footer with Monad logo & watermark */}
      <footer style={{ position: "relative", marginTop:28 }}>
        <img 
          src={monadLogo}
          alt="Monad Logo"
          style={{width:34,opacity:.6,marginBottom:3}}
        /><br/>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#77509a" }}>
          Open Source • Monad Hackathon Demo
        </span>
      </footer>
      <div className="watermark-maxis">Maxis</div>
    </div>
  );
}

export default App;