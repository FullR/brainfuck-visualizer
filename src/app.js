import React from "react";
import ReactDOM from "react-dom";

const tokenFunctions = {
  ">"(state) {
    const newPointer = state.pointer + 1;
    return {
      ...state,
      pointer: newPointer,
      index: state.index + 1,
      data: {
        ...state.data,
        [newPointer]: state.data[newPointer] || 0
      }
    };
  },
  "<"(state) {
    const newPointer = state.pointer - 1;
    return {
      ...state,
      pointer: newPointer,
      index: state.index + 1,
      data: {
        ...state.data,
        [newPointer]: state.data[newPointer] || 0
      }
    };
  },
  "+"(state) {
    return {
      ...state,
      index: state.index + 1,
      data: {
        ...state.data,
        [state.pointer]: (state.data[state.pointer] || 0) + 1
      }
    };
  },
  "-"(state) {
    return {
      ...state,
      index: state.index + 1,
      data: {
        ...state.data,
        [state.pointer]: (state.data[state.pointer] || 0) - 1
      }
    };
  },
  "."(state) {
    return {
      ...state,
      index: state.index + 1,
      stdout: state.stdout + String.fromCharCode(state.data[state.pointer])
    };
  },
  ","(state) {
    const c = state.stdin[0];
    const newStdin = state.stdin.slice(1);
    return {
      ...state,
      stdin: newStdin,
      index: state.index + 1,
      data: {
        ...state.data,
        [state.pointer]: c
      }
    };
  },
  "["(state) {
    if(!state.data[state.pointer]) {
      const matchingIndex = findMatchingBrace(state.source, state.index, "]");
      if(matchingIndex === -1) {
        throw new Error(`Mismatched braces. No matching brace found for brace at index ${index} in string "${str}"`);
      } else {
        // check for infinite loop (if there are no control characters inside the loop body, it's infinite)
        const loopContent = state.source.slice(state.index, matchingIndex);
        const validContentCharCount = loopContent.split("").filter((c) => tokenFunctions.hasOwnProperty(c)).length;

        if(matchingIndex === state.index + 1 || validContentCharCount <= 1) throw new Error("Infinite loop detected");
        return {
          ...state,
          index: matchingIndex + 1
        };
      }
    } else {
      return {
        ...state,
        index: state.index + 1,
      };
    }
  },
  "]"(state) {
    if(state.data[state.pointer]) {
      const matchingIndex = findMatchingBrace(state.source, state.index, "[", -1);
      if(matchingIndex === -1) {
        throw new Error(`Mismatched braces. No matching brace found for brace at index ${index} in string "${str}"`);
      } else {
        return {
          ...state,
          index: matchingIndex + 1
        };
      }
    } else {
      return {
        ...state,
        index: state.index + 1,
      };
    }
  }
};

function findMatchingBrace(str, index, closingBraceChar, counter=1) {
  const braceChar = str[index];
  const {length} = str;
  let depth = 1;
  let i;

  for(i = index + counter; i < length && i >= 0; i += counter) {
    if(str[i] === closingBraceChar) {
      if(depth === 1) {
        return i;
      } else {
        depth -= 1;
      }
    } else if(str[i] === braceChar) {
      depth += 1;
    }
  }

  return -1;
}

function brainfuck(source, stdin=[]) {
  const initialState = {
    source,
    stdin,
    stdout: "",
    data: {"0": 0},
    pointer: 0,
    index: 0
  };
  const sourceChars = source.split("");

  // check for brace syntax issues
  const openBraceCount = sourceChars.filter((c) => c === "[").length;
  const closeBraceCount = sourceChars.filter((c) => c === "]").length;
  const firstOpenBrace = source.indexOf("[");
  const firstCloseBrace = source.indexOf("]");
  const lastOpenBrace = source.lastIndexOf("[");
  const lastCloseBrace = source.lastIndexOf("]");
  const mismatchBraceError = openBraceCount !== closeBraceCount ||
    (firstOpenBrace !== -1 && firstCloseBrace !== -1 && firstCloseBrace < firstOpenBrace) ||
    (lastOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace < lastOpenBrace);

  if(mismatchBraceError) throw new Error("Mismatched braces");


  let state = initialState;
  const states = [state];
  const {length} = source;

  for(; state.index < length;) {
    const token = source[state.index];
    if(tokenFunctions.hasOwnProperty(token)) {
      state = tokenFunctions[token](state);
      states.push(state);
    } else {
      state = {...state, index: state.index + 1};
    }
  }

  return {state, states};
}

const src = "++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.";
const result = brainfuck(src);

class DataCell extends React.Component {
  render() {
    const {address, value, active} = this.props;
    return (
      <div className={`data-cell ${active ? "data-cell--active" : ""}`}>
        <div className="data-cell__value">{value}</div>
        <div className="data-cell__addr">{address}</div>
      </div>
    );
  }
}

class App extends React.Component {
  state = {
    source: src,
    result: result,
    stepIndex: result.states.length - 1,
    playInterval: 100
  };

  updatePlaySpeed(event) {
    const playInterval = parseInt(event.target.value, 10);

    this.setState({playInterval});

    if(this.state.playing) {
      this.stopPlaying();
      setTimeout(this.startPlaying.bind(this), 0);
    }
  }

  startPlaying() {
    const {result, stepIndex, playInterval, error} = this.state;
    if(error) return;

    this.playInterval = setInterval(() => {
      if(this.state.stepIndex >= result.states.length - 1) {
        this.stopPlaying();
      } else {
        this.stepForward();
      }
    }, playInterval);

    this.setState({
      playing: true,
      stepIndex: stepIndex >= result.states.length - 1 ? 0 : stepIndex
    });
  }

  stopPlaying() {
    this.setState({
      playing: false
    });
    clearInterval(this.playInterval);
  }

  stepBack() {
    this.setState({
      stepIndex: Math.max(0, this.state.stepIndex - 1)
    });
  }

  stepForward() {
    this.setState({
      stepIndex: Math.min(this.state.result.states.length - 1, this.state.stepIndex + 1)
    });
  }

  stepMax() {
    this.setState({
      stepIndex: this.state.result.states.length - 1
    });
  }

  stepMin() {
    this.setState({
      stepIndex: 0
    });
  }

  setSource(event) {
    const source = event.target.value;
    try {
      const result = brainfuck(source);
      this.setState({
        source, result,
        stepIndex: result.states.length - 1,
        error: null
      });
    } catch(error) {
      this.setState({
        source,
        playing: false,
        error
      });
    }
    if(this.state.playing) {
      this.stopPlaying();
    }
  }

  render() {
    const {result, stepIndex, source, playing, playInterval, error} = this.state;
    const currentStep = result.states[stepIndex];
    const {data, pointer, stdout, index} = currentStep;
    return (
      <div>
        <h1>Brainfuck Visualizer</h1>
        <div className="source-label">Source</div>
        <textarea cols="1" rows="5" style={{width: "100%"}} value={source} onChange={this.setSource.bind(this)}/>
        <div className="source">
          {error ? <div className="error">Error: {error.message}</div> : source.split("").map((token, i) =>
            <span key={i} className={i === index ? "active-token" : null}>{token}</span>
          )}
        </div>
        <div className="step-label">Step Control</div>
        <div className="control-buttons">
          <button onClick={this.stepMin.bind(this)}>
            {"<<"}
          </button>
          <button onClick={this.stepBack.bind(this)}>
            {"<"}
          </button>
          <span className="step-index">
            {stepIndex + 1}/{result.states.length}
          </span>
          <button onClick={this.stepForward.bind(this)}>
            {">"}
          </button>
          <button onClick={this.stepMax.bind(this)}>
            {">>"}
          </button>
          <div>
            <button onClick={playing ? this.stopPlaying.bind(this) : this.startPlaying.bind(this)}>
              {playing ? "Stop" : "Play"}
            </button>
          </div>
          <div className="play-speed-label">Play speed</div>
          <input onChange={this.updatePlaySpeed.bind(this)} value={playInterval}/>
        </div>
        <div className="data-label">Data</div>
        <div>
          <DataCell address="Address" value="Value"/>
          {Object.keys(data).map((address) =>
            <DataCell active={pointer === +address} key={address} address={address} value={data[address]}/>
          )}
        </div>
        <div className="stdout-label">stdout</div>
        <div>{stdout}</div>
      </div>
    );
  }
}

ReactDOM.render(<App/>, document.querySelector("#app"));
